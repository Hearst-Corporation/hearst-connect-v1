import 'server-only'

import type { BackendResolved } from '@/lib/admin-dashboard/cache'
import { callBackend } from '@/lib/backend/client'

/**
 * L'ESPACE CLIENT — ses lectures, à l'échelle du CLIENT.
 *
 * Chaque chiffre vient du livre de ses vaults (un par versement) : le même que
 * lit l'admin. Une lecture qui échoue rend `null` — l'écran le dit, il
 * n'invente rien à la place.
 */

export type PortalVault = Readonly<{
  vaultId: string
  label: string
  status: 'ACTIVE' | 'RELEASED' | string
  /** Le mois (YYYY-MM) où la réserve a été rendue au client, s'il l'a été. */
  releasedMonth?: string | null
  principalUsdc: number
  entryRateUsd: number
  capitalBtc: number
  producedBtc: number
  withdrawnBtc: number
  pendingWithdrawalBtc: number
  availableBtc: number
  reserveBtc: number
  vsHodlPct: number
  lockupStartAt: string
  lockupEndAt: string
  lockupMonths: number
  /** La composition du vault dans le temps — part de chaque bucket, en %. */
  allocationHistory?: readonly Readonly<{ at: string; shares: Readonly<Record<string, number>> }>[]
  elapsedMonths: number
  nextRewardAt: string | null
  allocation: Readonly<{
    target: Readonly<{ mining: number; lending: number; stable: number }>
    current: Readonly<{ mining: number; lending: number; stable: number }>
    bandBps: number
  }>
  pockets: readonly Readonly<{ name: string; protocol: string; apyPct: number; capitalUsd: number }>[]
  compute: Readonly<{ hashrateThs: number; machines: number; fleetSharePct: number }>
  endOfTerm: 'release' | 'renew' | 'undecided' | string
}>

export type PortalOverview = Readonly<{
  client: Readonly<{ id: string; name: string; kind: string | null; since: string | null }>
  owner: Readonly<{ name: string; title: string; email: string; phone: string }>
  spotUsd: number
  totals: Readonly<{
    reserveBtc: number
    valueUsd: number
    depositedUsdc: number
    capitalBtc: number
    producedBtc: number
    withdrawnBtc: number
    availableBtc: number
    pendingWithdrawalBtc: number
    vsHodlPct: number
  }>
  lastReward: Readonly<{ month: string; btc: number; usd: number; vault: string }> | null
  vaults: readonly PortalVault[]
}>

export type PortalReward = Readonly<{
  vaultId: string
  vault: string
  month: string
  status: 'pending' | 'approved' | 'distributed' | 'declined' | string
  btc: number
  usd: number
  priceUsd: number
  pockets: readonly Readonly<{ bucket: string; btc: number; usd: number }>[]
}>

export type PortalActivity = Readonly<{
  id: string
  at: string
  type: 'deposit' | 'reward' | 'withdrawal' | 'release' | string
  vault: string
  btc: number
  usd: number
  status: string
  txHash: string | null
  steps: readonly Readonly<{ label: string; at: string | null; done: boolean }>[] | null
  destination?: string
  month?: string
}>

export type PortalWallet = Readonly<{
  id: string
  label: string
  asset: string
  network: string
  address: string
  addedAt: string
  activeFrom: string
  status: 'active' | 'cooling' | string
}>

export type PortalDocument = Readonly<{
  id: string
  kind: 'statement' | 'tax' | 'proposal' | string
  title: string
  period: string
  vaultId: string | null
  vault: string
  offerId?: string
}>

export type PortalPreferences = Readonly<{
  notifications: Readonly<Record<string, boolean>>
  team: readonly Readonly<{ name: string; email: string; role: string; twoFactor: boolean }>[]
  security: Readonly<{ twoFactor: boolean; lastSignInAt: string; sessions: number }>
}>

async function read<T>(id: string, key: string, params?: Record<string, string>): Promise<T | null> {
  try {
    const res = await callBackend<Record<string, BackendResolved<T>>>(id, params ? { params } : {})
    return res.ok ? (res.data[key]?.value ?? null) : null
  } catch {
    return null
  }
}

export const loadOverview = () => read<PortalOverview>('me-overview', 'overview')
export const loadRewards = (vaultId?: string) => read<readonly PortalReward[]>('me-rewards', 'rewards', vaultId ? { vaultId } : undefined)
export const loadActivity = () => read<readonly PortalActivity[]>('me-activity', 'activity')
export const loadWallets = () => read<readonly PortalWallet[]>('me-wallets', 'wallets')
export const loadDocuments = () => read<readonly PortalDocument[]>('me-documents', 'documents')
export const loadPreferences = () => read<PortalPreferences>('me-preferences', 'preferences')
