#!/usr/bin/env node
/**
 * Publie les relevés du réseau bitcoin dans HearstMiningOracle.
 *
 * Lit en direct :
 *   - mempool.space : difficulté, hashrate mesuré, hauteur du dernier bloc, frais moyens des 15 derniers blocs ;
 *   - Coinbase : cours BTC/USD (utilisé seulement si l'oracle n'a pas de flux Chainlink).
 * puis signe `publishNetwork` avec `cast send`. Le contrat calcule lui-même le reste (coût d'un bitcoin,
 * hashprice, marge).
 *
 * Usage :
 *   MINING_ORACLE_ADDRESS=0x… node publish-network.mjs --rpc-url sepolia --account hearst-publisher
 *   MINING_ORACLE_ADDRESS=0x… node publish-network.mjs --rpc-url local --unlocked --from 0x7099…
 *   node publish-network.mjs --dry-run        # affiche les relevés sans rien envoyer
 * Les arguments après le script sont passés tels quels à `cast send`.
 * Une tâche planifiée (cron, launchd) le lance toutes les heures : `maxAge` du contrat dit au-delà
 * de quand l'espace client affiche les relevés comme périmés.
 */
import { execFileSync } from 'node:child_process'

const MEMPOOL = 'https://mempool.space/api'

async function json(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)
  return res.json()
}

async function readings() {
  const [mining, height, blocks, spot] = await Promise.all([
    json(`${MEMPOOL}/v1/mining/hashrate/3d`),
    json(`${MEMPOOL}/blocks/tip/height`),
    json(`${MEMPOOL}/v1/blocks`),
    json('https://api.coinbase.com/v2/prices/BTC-USD/spot'),
  ])
  const fees = blocks.map((b) => b.extras?.totalFees).filter((f) => Number.isFinite(f))
  if (fees.length === 0) throw new Error('mempool.space : aucun frais de bloc lisible')
  return {
    // La difficulté est publiée en entier : la partie décimale ne change pas le calcul.
    difficulty: BigInt(Math.round(mining.currentDifficulty)),
    hashrateHs: BigInt(Math.round(mining.currentHashrate)),
    blockHeight: Number(height),
    feesPerBlockSats: BigInt(Math.round(fees.reduce((a, b) => a + b, 0) / fees.length)),
    btcUsdE8: BigInt(Math.round(Number(spot.data.amount) * 1e8)),
  }
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const r = await readings()

console.log('Relevés du réseau')
console.log(`  difficulté      ${(Number(r.difficulty) / 1e12).toFixed(2)} T`)
console.log(`  hashrate        ${(Number(r.hashrateHs) / 1e18).toFixed(1)} EH/s`)
console.log(`  hauteur         ${r.blockHeight}`)
console.log(`  frais / bloc    ${(Number(r.feesPerBlockSats) / 1e8).toFixed(5)} BTC`)
console.log(`  cours           ${(Number(r.btcUsdE8) / 1e8).toFixed(2)} $`)

if (dryRun) process.exit(0)

const oracle = process.env.MINING_ORACLE_ADDRESS
if (!oracle) {
  console.error('MINING_ORACLE_ADDRESS manquant')
  process.exit(1)
}

execFileSync(
  'cast',
  [
    'send',
    oracle,
    'publishNetwork(uint128,uint128,uint32,uint64,uint64)',
    r.difficulty.toString(),
    r.hashrateHs.toString(),
    String(r.blockHeight),
    r.feesPerBlockSats.toString(),
    r.btcUsdE8.toString(),
    ...args,
  ],
  { stdio: 'inherit' },
)
