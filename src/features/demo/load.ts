import 'server-only'

import { callBackend } from '@/lib/backend/client'

/**
 * L'ÉTAT DE LA DÉMO GUIDÉE, lu dans le backend de démonstration.
 *
 * Un vrai backend ne connaît pas `/api/v1/demo/state` : l'appel échoue, on
 * renvoie `null`, et le bouton de démo n'apparaît nulle part.
 */

export type DemoVault = Readonly<{
  vaultId: string
  tranche: number
  openedAt: string
  lockupEndAt: string
  lockupEnded: boolean
  released: boolean
  monthsRewarded: number
  rewardsValidated: number
  pendingReward: string | null
  closedMonth: string | null
  electricityPaid: boolean
  rebalances: number
  withdrawals: readonly Readonly<{ id: string; status: string; btc: number }>[]
  availableBtc: number
  drifting: boolean
}>

export type DemoState = Readonly<{
  clock: number
  today: string
  lastClosed: string
  tour: Readonly<{ clientName: string; offerId: string | null }> | null
  viewAs: string | null
  offer: Readonly<{
    id: string
    reference?: string
    clientId: string | null
    status: string
    fundsReceivedAt?: string | null
  }> | null
  client: Readonly<{ id: string; label: string; kyc: string | null; aml: string | null }> | null
  vaults: readonly DemoVault[]
  offers: readonly Readonly<{ id: string; reference: string; status: string }>[]
}>

export async function loadDemoState(): Promise<DemoState | null> {
  try {
    const res = await callBackend<{ state: DemoState }>('demo-state')
    return res.ok ? (res.data.state ?? null) : null
  } catch {
    return null
  }
}
