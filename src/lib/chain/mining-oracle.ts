import 'server-only'

import { chainExplorerUrl, chainRpcUrl, miningOracleAddress } from '@/lib/env'
import type { ProductionCost } from '@/lib/product/readings'
import { available, unavailable, type Availability } from '@/lib/vaults/model'
import { createPublicClient, http } from 'viem'

/**
 * MINING ECONOMICS — lu sur la chaîne, dans `HearstMiningOracle`
 * (contracts/src/HearstMiningOracle.sol).
 *
 * Le contrat garde les relevés du réseau (difficulté, hashrate, hauteur, frais
 * de bloc), le cours BTC/USD (flux Chainlink ou cours publié) et les paramètres
 * du parc (électricité, J/TH, machines) ; il CALCULE le coût pour miner un
 * bitcoin, le hashprice et la marge. Ce module ne fait que convertir ses unités
 * entières en nombres affichables : aucun chiffre du bloc n'est calculé ici.
 *
 * Pas de nœud, pas d'adresse, un appel qui échoue : le bloc dit « indisponible »
 * plutôt que d'afficher une supposition.
 */

export const MINING_ORACLE_SOURCE = 'HearstMiningOracle.economics()'

const ECONOMICS_ABI = [
  {
    type: 'function',
    name: 'economics',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'e',
        type: 'tuple',
        components: [
          { name: 'btcUsdE8', type: 'uint256' },
          { name: 'difficulty', type: 'uint256' },
          { name: 'hashrateHs', type: 'uint256' },
          { name: 'blockHeight', type: 'uint256' },
          { name: 'blockRewardSats', type: 'uint256' },
          { name: 'powerUsdPerKwhE6', type: 'uint256' },
          { name: 'efficiencyJthE2', type: 'uint256' },
          { name: 'satsPerThDayE9', type: 'uint256' },
          { name: 'hashpriceUsdPerPhDayE8', type: 'uint256' },
          { name: 'energyCostPerBtcUsdE8', type: 'uint256' },
          { name: 'costPerBtcUsdE8', type: 'uint256' },
          { name: 'marginPerBtcUsdE8', type: 'int256' },
          { name: 'marginBps', type: 'int256' },
          { name: 'networkUpdatedAt', type: 'uint256' },
          { name: 'priceUpdatedAt', type: 'uint256' },
          { name: 'priceFromFeed', type: 'bool' },
          { name: 'stale', type: 'bool' },
        ],
      },
    ],
  },
] as const

const e8 = (v: bigint) => Number(v) / 1e8

export async function readMiningEconomics(): Promise<Availability<ProductionCost>> {
  const rpc = chainRpcUrl()
  const address = miningOracleAddress()
  if (rpc === null || address === null) {
    return unavailable({ reason: 'chain_not_configured', endpoint: MINING_ORACLE_SOURCE, status: 'NOT_CONFIGURED' })
  }

  try {
    const client = createPublicClient({ transport: http(rpc, { timeout: 8_000 }) })
    const [e, chainId] = await Promise.all([
      client.readContract({ address, abi: ECONOMICS_ABI, functionName: 'economics' }),
      client.getChainId(),
    ])
    const explorer = chainExplorerUrl()
    const asOf = new Date(Number(e.networkUpdatedAt) * 1000).toISOString()
    return available<ProductionCost>(
      {
        costPerBtcUsd: e8(e.costPerBtcUsdE8),
        energyCostPerBtcUsd: e8(e.energyCostPerBtcUsdE8),
        marketPriceUsd: e8(e.btcUsdE8),
        marginPct: Number(e.marginBps) / 100,
        marginPerBtcUsd: e8(e.marginPerBtcUsdE8),
        electricityUsdPerKwh: Number(e.powerUsdPerKwhE6) / 1e6,
        networkDifficulty: Number(e.difficulty),
        hashrateEhs: Number(e.hashrateHs) / 1e18,
        hashpriceUsdPerPhDay: e8(e.hashpriceUsdPerPhDayE8),
        blockHeight: Number(e.blockHeight),
        asOf,
        onChain: {
          address,
          chainId,
          explorerUrl: explorer ? `${explorer}/address/${address}#readContract` : null,
          priceFromFeed: e.priceFromFeed,
        },
      },
      { provenance: 'chain', asOf, stale: e.stale },
    )
  } catch {
    // Le contrat refuse tant qu'aucun relevé n'est publié (NoNetwork) ; le nœud peut aussi
    // être injoignable. Dans les deux cas, rien n'est affiché à la place.
    return unavailable({ reason: 'chain_read_failed', endpoint: MINING_ORACLE_SOURCE })
  }
}
