import 'server-only'

import { createPublicClient, http, type PublicClient } from 'viem'
import { chainExplorerUrl, chainRpcUrl } from '@/lib/env'

/** Le client de lecture Ethereum de l'application. `null` sans nœud configuré. */
export function chainClient(): PublicClient | null {
  const rpc = chainRpcUrl()
  return rpc === null ? null : createPublicClient({ transport: http(rpc, { timeout: 8_000 }) })
}

/** Le lien « Read Contract » d'un contrat sur l'explorateur, ou `null` sans explorateur configuré. */
export function contractLink(address: string): string | null {
  const explorer = chainExplorerUrl()
  return explorer ? `${explorer}/address/${address}#readContract` : null
}
