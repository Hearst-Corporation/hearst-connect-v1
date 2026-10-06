import 'server-only'

import {
  loadAdminApprovals,
  loadAdminOffers,
  loadAdminRecentClients,
  loadAdminVaultRegistry,
} from '@/lib/admin-dashboard/load'
import {
  isVaultDrifting,
  type AdminApproval,
  type AdminRecentClient,
  type AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import { OFFER_NEXT_STEP, isTerminal, type Offer, type OfferStatus } from '@/lib/offers/model'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * LE REGISTRE DES CLIENTS — une ligne par client, où qu'il en soit.
 *
 * Un client n'est qu'UNE entité qui avance dans un parcours : qualifié, une
 * offre préparée puis envoyée, acceptée, ses fonds appelés puis reçus, son
 * vault ouvert, puis la vie du vault (distributions, retraits, rééquilibrages,
 * fin de lockup). La console découpait ce parcours en trois menus — Offers,
 * Clients, Vaults — qui voyaient chacun un morceau, avec deux « pending » qui
 * ne voulaient pas dire la même chose.
 *
 * Ici, les quatre sources se rejoignent par l'identifiant client : l'annuaire
 * (identité + KYC Som), les offres, le registre des vaults, la file des
 * décisions. Chaque client reçoit UNE étape et UNE action attendue.
 */

/** Où en est le client. L'ordre est celui du parcours. */
export type ClientStage =
  | 'prospect'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'funding'
  | 'funded'
  | 'active'
  | 'closed'

export const STAGE_LABEL: Readonly<Record<ClientStage, string>> = {
  prospect: 'Prospect',
  draft: 'Offer draft',
  sent: 'Offer sent',
  accepted: 'Accepted',
  funding: 'Awaiting funds',
  funded: 'Funds received',
  active: 'Active vault',
  closed: 'Closed',
}

/** Les étapes du parcours commercial — avant que le vault existe. */
export const PIPELINE_STAGES: readonly ClientStage[] = ['prospect', 'draft', 'sent', 'accepted', 'funding', 'funded']

/** Un terme à moins de trois mois est un renouvellement à préparer. */
export const DUE_SOON_MONTHS = 3

export type ClientEntry = Readonly<{
  clientId: string
  name: string
  kind: string | null
  stage: ClientStage
  /** Pour un client sorti du parcours : déclinée ou expirée. */
  closedReason: 'declined' | 'expired' | null
  /** Le capital du vault s'il tourne, sinon le montant de l'offre en cours. */
  amountUsdc: number | null
  kycStatus: string | null
  /** L'offre la plus récente — celle qui fait avancer le client. */
  offer: Offer | null
  vault: AdminVaultRecord | null
  decisions: readonly AdminApproval[]
  /** Ce qui doit se passer maintenant. */
  nextAction: string | null
  /** Vrai quand cette action est de NOTRE côté — c'est ce qu'on traite d'abord. */
  onUs: boolean
}>

export type ClientBook = Readonly<{
  entries: readonly ClientEntry[]
  /** Lecture complète : les quatre sources ont répondu. */
  complete: boolean
  missing: readonly string[]
}>

const KYC_OK = new Set(['APPROVED', 'VERIFIED'])

function monthsLeft(v: AdminVaultRecord): number | null {
  if (v.lockupEndAt !== null) return (Date.parse(v.lockupEndAt) - Date.now()) / (30.44 * 86_400_000)
  if (v.lockupMonths !== null && v.lockupElapsedMonths !== null) return v.lockupMonths - v.lockupElapsedMonths
  return null
}

/** L'étape d'un client, lue dans son vault puis dans son offre la plus récente. */
function stageOf(vault: AdminVaultRecord | null, offer: Offer | null): Pick<ClientEntry, 'stage' | 'closedReason'> {
  if (vault !== null && vault.status.toUpperCase() === 'ACTIVE') return { stage: 'active', closedReason: null }
  if (offer === null) return { stage: 'prospect', closedReason: null }
  if (offer.status === 'declined' || offer.status === 'expired') return { stage: 'closed', closedReason: offer.status }
  if (offer.status === 'active') return { stage: 'active', closedReason: null }
  return { stage: offer.status as Exclude<OfferStatus, 'active' | 'declined' | 'expired'>, closedReason: null }
}

/**
 * L'action attendue, par ordre de priorité : ce qui bloque un client passe
 * avant ce qui l'informe. Une décision en attente bloque son argent ; une
 * dérive hors bande demande un arbitrage ; un lockup qui finit demande un
 * renouvellement ; une offre attend son étape suivante.
 */
function nextActionOf(
  stage: ClientStage,
  offer: Offer | null,
  vault: AdminVaultRecord | null,
  decisions: readonly AdminApproval[],
  kycStatus: string | null,
): Pick<ClientEntry, 'nextAction' | 'onUs'> {
  if (decisions.length > 0) {
    const n = decisions.length
    return { nextAction: `${n} decision${n > 1 ? 's' : ''} waiting on you`, onUs: true }
  }
  if (stage === 'active' && vault !== null) {
    if (isVaultDrifting(vault)) return { nextAction: 'Rebalance — drift beyond its band', onUs: true }
    const left = monthsLeft(vault)
    if (left !== null && left <= DUE_SOON_MONTHS) {
      return { nextAction: left <= 0 ? 'Lockup ended — renew or release' : 'Lockup ends soon — prepare renewal', onUs: true }
    }
    // Une deuxième offre en préparation (tranche supplémentaire, renouvellement).
    if (offer !== null && !isTerminal(offer.status) && OFFER_NEXT_STEP[offer.status] !== null) {
      return { nextAction: `${OFFER_NEXT_STEP[offer.status]} (new tranche)`, onUs: true }
    }
    return { nextAction: null, onUs: false }
  }
  const kycBlocks = kycStatus === null || !KYC_OK.has(kycStatus.toUpperCase())
  switch (stage) {
    case 'prospect':
      return { nextAction: 'Prepare an offer', onUs: true }
    case 'draft':
      return { nextAction: 'Finish and send the offer', onUs: true }
    case 'sent':
      return { nextAction: 'Waiting on the client’s answer', onUs: false }
    case 'accepted':
      return kycBlocks
        ? { nextAction: 'KYC pending with Som — funds cannot be called yet', onUs: false }
        : { nextAction: 'Issue credentials and request funds', onUs: true }
    case 'funding':
      return { nextAction: 'Waiting for the transfer', onUs: false }
    case 'funded':
      return { nextAction: 'Open the vault', onUs: true }
    default:
      return { nextAction: null, onUs: false }
  }
}

function norm(name: string): string {
  return name.trim().toLowerCase()
}

export function buildClientBook(
  directory: Availability<readonly AdminRecentClient[]>,
  offers: Availability<readonly Offer[]>,
  vaults: Availability<readonly AdminVaultRecord[]>,
  approvals: Availability<readonly AdminApproval[]>,
): ClientBook {
  const dir = isAvailable(directory) ? directory.value : []
  const offerRows = isAvailable(offers) ? offers.value : []
  const vaultRows = isAvailable(vaults) ? vaults.value : []
  const decisionRows = isAvailable(approvals) ? approvals.value : []

  /* Les identités : l'annuaire d'abord, puis tout client que seule une offre ou
     un vault connaît encore (le backend ne les a pas tous publiés). */
  const ids = new Map<string, { name: string; kyc: string | null }>()
  for (const c of dir) ids.set(c.id, { name: c.label, kyc: c.kycStatus })
  for (const v of vaultRows) if (!ids.has(v.clientId)) ids.set(v.clientId, { name: v.clientLabel, kyc: null })
  const byName = new Map([...ids].map(([id, c]) => [norm(c.name), id]))
  const clientIdOfOffer = (o: Offer): string =>
    o.clientId ??
    vaultRows.find((v) => o.vaultId !== null && v.vaultId === o.vaultId)?.clientId ??
    byName.get(norm(o.clientName)) ??
    `offer:${o.id}`
  for (const o of offerRows) {
    const id = clientIdOfOffer(o)
    if (!ids.has(id)) ids.set(id, { name: o.clientName, kyc: null })
  }

  const entries: ClientEntry[] = [...ids].map(([clientId, ident]) => {
    const vault = vaultRows.find((v) => v.clientId === clientId) ?? null
    const clientOffers = offerRows
      .filter((o) => clientIdOfOffer(o) === clientId)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    // L'offre qui fait avancer : la plus récente encore ouverte, sinon la plus récente.
    const offer = clientOffers.find((o) => !isTerminal(o.status)) ?? clientOffers[0] ?? null
    const decisions = decisionRows.filter((d) => d.clientId === clientId)
    const { stage, closedReason } = stageOf(vault, offer)
    const { nextAction, onUs } = nextActionOf(stage, offer, vault, decisions, ident.kyc)
    return {
      clientId,
      name: ident.name,
      kind: vault?.clientKind ?? offer?.clientKind ?? null,
      stage,
      closedReason,
      amountUsdc: stage === 'active' ? (vault?.principalUsdc ?? offer?.amountUsdc ?? null) : (offer?.amountUsdc ?? null),
      kycStatus: ident.kyc,
      offer,
      vault,
      decisions,
      nextAction,
      onUs,
    }
  })

  /* Ce qui attend une action de notre part d'abord, puis l'ordre du parcours
     (le plus avancé en tête), puis le montant. */
  const order: ClientStage[] = ['active', 'funded', 'funding', 'accepted', 'sent', 'draft', 'prospect', 'closed']
  entries.sort(
    (a, b) =>
      Number(b.onUs) - Number(a.onUs) ||
      order.indexOf(a.stage) - order.indexOf(b.stage) ||
      (b.amountUsdc ?? 0) - (a.amountUsdc ?? 0),
  )

  const missing = [
    !isAvailable(directory) && 'client directory',
    !isAvailable(offers) && 'offers',
    !isAvailable(vaults) && 'vault registry',
    !isAvailable(approvals) && 'decisions',
  ].filter((m): m is string => typeof m === 'string')

  return { entries, complete: missing.length === 0, missing }
}

export async function loadClientBook(): Promise<ClientBook> {
  const [directory, offers, vaults, approvals] = await Promise.all([
    loadAdminRecentClients(100),
    loadAdminOffers(),
    loadAdminVaultRegistry(),
    loadAdminApprovals(),
  ])
  return buildClientBook(directory, offers, vaults, approvals)
}
