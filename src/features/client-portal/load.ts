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
  /** V2 — le buffer USDC qui paie l'électricité : 15 % du dépôt au départ, rechargé sur le bitcoin miné. */
  buffer?: PortalBuffer
  compute: Readonly<{ hashrateThs: number; machines: number; fleetSharePct: number }>
  endOfTerm: 'release' | 'renew' | 'undecided' | string
  /** Posé par `withChainLedger` : d'où viennent la réserve, le produit, les retraits et la comparaison au simple achat. */
  chain?: PortalVaultChain
}>

/** La preuve on-chain des chiffres d'un vault (HearstReserveRegistry). */
export type PortalVaultChain =
  | Readonly<{
      status: 'verified'
      /** Le dernier mois clos vérifié par le contrat (AAAA-MM). */
      month: string
      publishedAt: string
      registry: string
      explorerUrl: string | null
      /** Buffer d'électricité restant, en BTC au cours de clôture du mois — tel que le contrat le compte. */
      bufferBtc: number
      /** (réserve + déjà versé + buffer) ÷ simple achat, en %, calculé par le contrat. */
      vsHoldPct: number
      /** Lignes refusées par le contrat (jamais affichées). */
      rejected: number
      /** Continuité mois à mois vérifiée par le contrat (verifyContinuity). */
      continuity: Readonly<{ checked: number; ok: boolean }>
    }>
  | Readonly<{ status: 'unverified' | 'unconfigured' }>

export type PortalBuffer = Readonly<{
  startUsd: number
  balanceUsd: number
  monthlyElectricityUsd: number
  monthsCovered: number | null
  electricityPaidUsd: number
  toppedUpBtc: number
  minedBtc: number
  floorMonths: number
  targetMonths: number
  history: readonly Readonly<{ month: string; electricityUsd: number; topUpBtc: number; balanceUsd: number }>[]
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
  /** V2 — le bitcoin miné ce mois-là, la part vendue pour recharger le buffer, l'électricité payée sur le buffer. */
  minedBtc?: number
  /** V2 — les frais Hearst : 15 % du miné net d'électricité. */
  feeBtc?: number
  refillBtc?: number
  electricityUsd?: number
  /** Posé par `withChainLedger` : la ligne de ce mois a été vérifiée par HearstReserveRegistry. */
  onChain?: boolean
}>

export type PortalActivity = Readonly<{
  id: string
  at: string
  /** V2 : `refill` (bitcoin vendu pour recharger le buffer), `electricity` (facture payée en USDC sur le buffer). */
  type: 'deposit' | 'reward' | 'withdrawal' | 'release' | 'refill' | 'electricity' | string
  vault: string
  /** Null pour une facture d'électricité : elle se paie en USDC, pas en bitcoin. */
  btc: number | null
  usd: number
  bufferAfterUsd?: number
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
/** Une ligne de vault du registre on-chain, telle que le backend la remet au client avec sa preuve. */
export type PortalAttestation = Readonly<{
  vaultId: string
  period: number
  month: string
  /** Les champs de `HearstReserveRegistry.VaultLine`, satoshis en chaînes. */
  line: Readonly<Record<string, string>>
  proof: readonly string[]
}>

export const loadAttestations = () => read<readonly PortalAttestation[]>('me-attestations', 'attestations')
/** Une transaction Fireblocks d'un mois, telle que le rapport mensuel la liste. */
export type PortalFireblocksTx = Readonly<{
  id: string
  kind: 'deposit' | 'electricity' | 'conversion' | 'fee' | 'withdrawal' | string
  asset: string
  amount: string
  at: string
  txHash: string
  vault?: string
}>

/** Le rapport d'un mois : son texte exact (dont l'empreinte est on-chain) et les transactions Fireblocks du client. */
export type PortalReport = Readonly<{ period: number; json: string; reportHash: string; mine: readonly PortalFireblocksTx[] }>

export const loadReport = (period: number) => read<PortalReport>('me-report', 'report', { period: String(period) })
export const loadActivity = () => read<readonly PortalActivity[]>('me-activity', 'activity')
export const loadWallets = () => read<readonly PortalWallet[]>('me-wallets', 'wallets')
export const loadDocuments = () => read<readonly PortalDocument[]>('me-documents', 'documents')
export const loadPreferences = () => read<PortalPreferences>('me-preferences', 'preferences')
