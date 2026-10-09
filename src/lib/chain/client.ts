import 'server-only'

import { createPublicClient, http, type PublicClient } from 'viem'
import { chainExplorerUrl, chainRpcUrl } from '@/lib/env'

/** Le client de lecture Ethereum de l'application. `null` sans nœud configuré. */
export function chainClient(): PublicClient | null {
  const rpc = chainRpcUrl()
  // Les lectures d'une même page partent groupées en une requête JSON-RPC (des dizaines de verifyVault
  // et verifyContinuity) : un aller-retour au nœud au lieu de dizaines.
  return rpc === null ? null : createPublicClient({ transport: http(rpc, { timeout: 10_000, batch: { batchSize: 100, wait: 16 } }) })
}

/** Le lien « Read Contract » d'un contrat sur l'explorateur, ou `null` sans explorateur configuré.
 *  Blockscout (code vérifié via Sourcify) et Etherscan n'écrivent pas l'onglet de la même façon. */
export function contractLink(address: string): string | null {
  const explorer = chainExplorerUrl()
  if (explorer === null) return null
  return explorer.includes('blockscout') ? `${explorer}/address/${address}?tab=read_contract` : `${explorer}/address/${address}#readContract`
}
