import 'server-only'

import { callBackend } from '@/lib/backend/client'
import type { BackendResolved } from '@/lib/admin-dashboard/cache'

/**
 * LES TRANSACTIONS FIREBLOCKS — tout ce qui déplace de l'argent.
 *
 * La console décide (autoriser, approuver, payer, rendre) ; Fireblocks exécute :
 * la transaction passe sa politique de co-signature, puis part sur la chaîne.
 * Le statut est celui de Fireblocks, relayé tel quel.
 */

export type FireblocksTxKind = 'deposit' | 'conversion' | 'withdrawal' | 'release' | 'electricity' | 'rebalance' | 'protocol'

export type FireblocksTx = Readonly<{
  id: string
  kind: FireblocksTxKind | string
  status: string
  clientId: string | null
  vaultId: string | null
  asset: string
  amount: number | null
  source: string | null
  destination: string | null
  note: string | null
  createdAt: string
  txHash: string | null
  consoleUrl: string | null
}>

/** `null` : la lecture a échoué (ou le backend ne publie pas encore ces transactions). */
export async function loadTransactions(clientId?: string): Promise<readonly FireblocksTx[] | null> {
  try {
    const res = await callBackend<{ transactions: BackendResolved<readonly FireblocksTx[]> }>(
      'admin-transactions',
      clientId ? { params: { clientId } } : {},
    )
    if (!res.ok) return null
    const value = res.data.transactions?.value
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}
