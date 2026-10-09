#!/usr/bin/env node
/**
 * La chaîne de la démo : déploie les deux contrats Hearst et les remplit.
 *
 *   1. HearstReserveRegistry — puis publie, mois par mois, l'attestation de tous les vaults de la
 *      démo (racine Merkle + totaux), calculée depuis le même livre que le backend de démo ;
 *   2. HearstMiningOracle — puis publie les relevés réels du réseau bitcoin (mempool.space, Coinbase).
 *
 * Local (anvil, comptes de test déverrouillés) :
 *   anvil                                  # terminal 1
 *   node scripts/demo-chain.mjs            # terminal 2
 * Sepolia (clés du keystore Foundry ; le mot de passe est demandé une seule fois) :
 *   ETHERSCAN_API_KEY=… node scripts/demo-chain.mjs --rpc-url $SEPOLIA_RPC_URL \
 *     --deployer hearst-publisher --publisher hearst-publisher --admin 0x… --publisher-address 0x… \
 *     --btc-usd-feed 0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43
 * Contrats déjà déployés : --registry 0x… --oracle 0x… (ne publie que les mois manquants).
 *
 * À la fin, le script affiche les variables à mettre dans .env.local (ou sur Vercel).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONTRACTS = join(ROOT, 'contracts')

const args = process.argv.slice(2)
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const rpc = opt('rpc-url', 'http://127.0.0.1:8545')
const local = !opt('deployer')
// Comptes de test d'anvil n°0 (admin, déploiement) et n°1 (publication).
const ANVIL_ADMIN = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const ANVIL_PUBLISHER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const admin = opt('admin', ANVIL_ADMIN)
const publisherAddress = opt('publisher-address', ANVIL_PUBLISHER)

/* Le mot de passe du keystore, demandé UNE fois (saisie masquée), puis passé à chaque transaction par un
   fichier temporaire lisible du seul utilisateur, effacé à la fin — sinon Foundry le redemande à chacune. */
async function askPassword() {
  process.stdout.write('Mot de passe du keystore Foundry : ')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  let raw = ''
  for await (const chunk of process.stdin) {
    raw += chunk.toString('utf8')
    if (raw.includes('\u0003')) process.exit(130)
    if (/[\r\n]/.test(raw)) break
  }
  process.stdin.setRawMode(false)
  process.stdin.pause()
  process.stdout.write('\n')
  // Un mot de passe COLLÉ arrive entouré des marqueurs invisibles du Terminal (ESC[200~ … ESC[201~) :
  // on les retire, ainsi que toute autre séquence d'échappement, puis on applique les effacements.
  let pw = ''
  for (const ch of raw.split(/[\r\n]/)[0].replace(/\u001b\[[0-9;]*[~A-Za-z]/g, '')) {
    pw = ch === '\u007f' || ch === '\b' ? pw.slice(0, -1) : pw + ch
  }
  return pw
}
let passwordFile = null
if (!local) {
  const dir = mkdtempSync(join(tmpdir(), 'hearst-'))
  passwordFile = join(dir, 'pw')
  // Lancé par la tâche planifiée : le mot de passe arrive dans un fichier (lu du Trousseau), sans question.
  writeFileSync(passwordFile, process.env.HEARST_KEYSTORE_PASSWORD_FILE ? readFileSync(process.env.HEARST_KEYSTORE_PASSWORD_FILE, 'utf8').trim() : await askPassword(), { mode: 0o600 })
  process.on('exit', () => rmSync(dir, { recursive: true, force: true }))
}
const signAs = (role) =>
  local
    ? ['--unlocked', '--from', role === 'deployer' ? ANVIL_ADMIN : ANVIL_PUBLISHER]
    : ['--account', opt(role === 'deployer' ? 'deployer' : 'publisher'), '--password-file', passwordFile]

const run = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { cwd: CONTRACTS, encoding: 'utf8', ...opts })
const cast = (...argv) => run('cast', argv).trim()
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/* Le numéro d'ordre (nonce) de chaque transaction, tenu ICI plutôt que redemandé au nœud : un accès
   public répartit les requêtes entre plusieurs serveurs, dont l'un peut ne pas avoir encore vu la
   transaction précédente — il redonnerait le même numéro, que le réseau refuse (« underpriced »). */
const signerAddress = (role) =>
  local
    ? role === 'deployer'
      ? ANVIL_ADMIN
      : ANVIL_PUBLISHER
    : cast('wallet', 'address', '--account', opt(role === 'deployer' ? 'deployer' : 'publisher'), '--password-file', passwordFile)
const nonces = new Map()
const syncNonce = (address) => nonces.set(address, Number(cast('nonce', address, '--rpc-url', rpc)))
function nextNonce(role) {
  const address = signerAddress(role)
  if (!nonces.has(address)) syncNonce(address)
  const n = nonces.get(address)
  nonces.set(address, n + 1)
  return { address, nonce: String(n) }
}

function deploy(contract, ctorArgs) {
  const out = run('forge', [
    'create',
    `src/${contract}.sol:${contract}`,
    '--rpc-url',
    rpc,
    '--broadcast',
    ...signAs('deployer'),
    '--nonce',
    nextNonce('deployer').nonce,
    // Code source vérifié sur Etherscan quand une clé est fournie (ETHERSCAN_API_KEY).
    ...(process.env.ETHERSCAN_API_KEY && !local ? ['--verify', '--etherscan-api-key', process.env.ETHERSCAN_API_KEY] : []),
    '--constructor-args',
    ...ctorArgs,
  ])
  const address = out.match(/Deployed to: (0x[0-9a-fA-F]{40})/)?.[1]
  if (!address) throw new Error(`${contract} : déploiement sans adresse\n${out}`)
  console.log(`${contract} déployé : ${address}`)
  return address
}

// ── 1. Le registre de réserve ─────────────────────────────────────────────
const mock = await import(join(ROOT, 'src/app/api/demo-backend/mock-data.js'))
mock.useWorld(null)

const registry =
  opt('registry') ?? deploy('HearstReserveRegistry', [admin, publisherAddress, String(mock.ATTEST_FEE_BPS), String(mock.ATTEST_REFILL_CAP_BPS)])
const latest = Number(cast('call', registry, 'latestPeriod()(uint32)', '--rpc-url', rpc).split(' ')[0])

const attestations = mock.demoAttestations().filter((a) => a.period > latest)
for (const a of attestations) {
  const t = a.totals
  // L'empreinte du « rapport » du mois : celle de ses lignes, faute de PDF dans la démo.
  const reportHash = '0x' + createHash('sha256').update(JSON.stringify(a.vaults.map((v) => v.line))).digest('hex')
  // Jusqu'à 4 essais : une erreur passagère du nœud ne doit pas arrêter la série. Avant de réessayer,
  // on relit la chaîne — le mois a peut-être été publié malgré l'erreur — et on recale le numéro d'ordre.
  for (let attempt = 1; ; attempt++) {
    const { address, nonce } = nextNonce('publisher')
    try {
      run(
        'cast',
        [
          'send',
          registry,
          'publish(uint32,bytes32,bytes32,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint32,uint64))',
          String(a.period),
          a.merkleRoot,
          reportHash,
          `(${t.minedSats},${t.electricitySats},${t.feeSats},${t.refillSats},${t.toReserveSats},${t.withdrawnSats},${t.reserveSats},${t.vaultCount},${t.btcCloseUsdE8})`,
          '--rpc-url',
          rpc,
          ...signAs('publisher'),
          '--nonce',
          nonce,
        ],
        { stdio: ['ignore', 'ignore', 'pipe'] },
      )
      break
    } catch (e) {
      pause(15_000)
      const now = Number(cast('call', registry, 'latestPeriod()(uint32)', '--rpc-url', rpc).split(' ')[0])
      syncNonce(address)
      if (now >= a.period) break
      if (attempt === 4) throw e
      console.log(`  ${a.period} : le nœud a refusé (${String(e.stderr ?? e.message).trim().split('\n')[0]}), nouvel essai…`)
    }
  }
  console.log(`  ${a.period} publié : ${t.vaultCount} vaults, racine ${a.merkleRoot.slice(0, 12)}…`)
}
if (attestations.length === 0) console.log('  registre à jour, rien à publier')

// ── 2. L'oracle de l'économie du minage ───────────────────────────────────
const terms = '(65000,1100,11200000,1460,86400)' // 0,065 $/kWh · 11 J/TH · 11,20 $/TH/s · 4 ans · 1 jour
const oracle =
  opt('oracle') ?? deploy('HearstMiningOracle', [admin, publisherAddress, opt('btc-usd-feed', '0x' + '0'.repeat(40)), terms])
execFileSync('node', ['publish-network.mjs', '--rpc-url', rpc, ...signAs('publisher'), '--nonce', nextNonce('publisher').nonce], {
  cwd: join(CONTRACTS, 'script-js'),
  env: { ...process.env, MINING_ORACLE_ADDRESS: oracle },
  stdio: ['ignore', 'inherit', 'inherit'],
})

console.log('\nÀ mettre dans .env.local (ou sur Vercel) :')
console.log(`HEARST_CHAIN_RPC_URL=${local ? rpc : '<l’URL RPC>'}`)
console.log(`HEARST_RESERVE_REGISTRY_ADDRESS=${registry}`)
console.log(`HEARST_MINING_ORACLE_ADDRESS=${oracle}`)
