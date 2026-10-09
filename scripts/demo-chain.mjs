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
 * Sepolia (clés du keystore Foundry) :
 *   node scripts/demo-chain.mjs --rpc-url $SEPOLIA_RPC_URL \
 *     --deployer hearst-deployer --publisher hearst-publisher --admin 0x… --publisher-address 0x…
 * Contrats déjà déployés : --registry 0x… --oracle 0x… (ne publie que les mois manquants).
 *
 * À la fin, le script affiche les variables à mettre dans .env.local (ou sur Vercel).
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
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
const signAs = (role) =>
  local
    ? ['--unlocked', '--from', role === 'deployer' ? ANVIL_ADMIN : ANVIL_PUBLISHER]
    : ['--account', opt(role === 'deployer' ? 'deployer' : 'publisher')]

const run = (cmd, argv, opts = {}) => execFileSync(cmd, argv, { cwd: CONTRACTS, encoding: 'utf8', ...opts })
const cast = (...argv) => run('cast', argv).trim()

function deploy(contract, ctorArgs) {
  const out = run('forge', [
    'create',
    `src/${contract}.sol:${contract}`,
    '--rpc-url',
    rpc,
    '--broadcast',
    ...signAs('deployer'),
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
  run(
    'cast',
    [
      'send',
      registry,
      'publish(uint32,bytes32,bytes32,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint32))',
      String(a.period),
      a.merkleRoot,
      reportHash,
      `(${t.minedSats},${t.electricitySats},${t.feeSats},${t.refillSats},${t.toReserveSats},${t.withdrawnSats},${t.reserveSats},${t.vaultCount})`,
      '--rpc-url',
      rpc,
      ...signAs('publisher'),
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  )
  console.log(`  ${a.period} publié : ${t.vaultCount} vaults, racine ${a.merkleRoot.slice(0, 12)}…`)
}
if (attestations.length === 0) console.log('  registre à jour, rien à publier')

// ── 2. L'oracle de l'économie du minage ───────────────────────────────────
const terms = '(65000,1100,11200000,1460,86400)' // 0,065 $/kWh · 11 J/TH · 11,20 $/TH/s · 4 ans · 1 jour
const oracle =
  opt('oracle') ?? deploy('HearstMiningOracle', [admin, publisherAddress, opt('btc-usd-feed', '0x' + '0'.repeat(40)), terms])
execFileSync('node', ['publish-network.mjs', '--rpc-url', rpc, ...signAs('publisher')], {
  cwd: join(CONTRACTS, 'script-js'),
  env: { ...process.env, MINING_ORACLE_ADDRESS: oracle },
  stdio: ['ignore', 'inherit', 'inherit'],
})

console.log('\nÀ mettre dans .env.local (ou sur Vercel) :')
console.log(`HEARST_CHAIN_RPC_URL=${local ? rpc : '<l’URL RPC>'}`)
console.log(`HEARST_RESERVE_REGISTRY_ADDRESS=${registry}`)
console.log(`HEARST_MINING_ORACLE_ADDRESS=${oracle}`)
