import type { Availability } from '@/lib/vaults/model'

/**
 * L'OFFRE — le chaînon qui manquait au domaine.
 *
 * Le produit se vend sur mesure : un appel, une proposition chiffrée, une
 * validation, un virement, puis un vault taillé pour ce client-là. Jusqu'ici le
 * code ne connaissait que les deux extrémités de cette chaîne — un client (via
 * son dossier KYC) et un vault actif — et rien de ce qui se passe entre les
 * deux. Tout le travail commercial vivait donc hors de l'outil.
 *
 * Une offre porte ce chaînon : à qui, combien, sur quelle allocation, et où
 * elle en est.
 */

/* ── Typologie de client ──────────────────────────────────────────────────
   Reprise du questionnaire d'entrée (« Which best describes your platform? »).
   L'intitulé exact du formulaire est conservé : un libellé traduit ici et pas
   là ferait deux vocabulaires pour une même réponse. */

/** Le ticket minimum d'un vault dédié, en USDC. En dessous, l'offre ne se crée pas. */
export const MIN_VAULT_USDC = 100_000

/** Le blocage proposé par défaut à une nouvelle offre, en mois — modifiable offre par offre. */
export const DEFAULT_LOCKUP_MONTHS = 24

export const CLIENT_KINDS = [
  'Crypto company',
  'Crypto exchange',
  'Wealth platform',
  'Custody / Infrastructure',
  'Fund',
  'Family office',
] as const

export type ClientKind = (typeof CLIENT_KINDS)[number]

/* ── Profil de risque ─────────────────────────────────────────────────────
   Les trois réponses de la question « What type of product interests you
   most? ». C'est LE pivot de la proposition : il commande l'allocation entre
   les trois poches, qu'on ajuste ensuite offre par offre. */

export const RISK_PROFILES = ['conservative', 'balanced', 'growth'] as const
export type RiskProfile = (typeof RISK_PROFILES)[number]

export const RISK_PROFILE_LABEL: Readonly<Record<RiskProfile, string>> = {
  conservative: 'Conservative',
  balanced: 'Balanced',
  growth: 'Growth',
}

/**
 * Allocation par défaut, en points de base, pour chaque profil.
 *
 * Ce sont des POINTS DE DÉPART, pas des règles : chaque offre reste modifiable
 * à la main, parce que deux clients d'un même profil n'ont pas les mêmes
 * contraintes. Le minage porte la différence entre profils — c'est la poche qui
 * produit le bitcoin sous le prix de marché, donc celle qui porte l'ambition.
 *
 * Chaque ligne somme à 10 000 bps ; `assertAllocationSums` le vérifie.
 */
export const DEFAULT_ALLOCATION: Readonly<
  Record<RiskProfile, Readonly<{ miningBps: number; lendingBps: number; stableBps: number }>>
> = {
  conservative: { miningBps: 2000, lendingBps: 2500, stableBps: 5500 },
  balanced: { miningBps: 4000, lendingBps: 2700, stableBps: 3300 },
  growth: { miningBps: 6000, lendingBps: 2500, stableBps: 1500 },
}

export type OfferAllocation = Readonly<{
  miningBps: number
  lendingBps: number
  stableBps: number
}>

/** Une allocation qui ne somme pas à 100 % est un bug de saisie, pas une donnée. */
export function allocationSumBps(a: OfferAllocation): number {
  return a.miningBps + a.lendingBps + a.stableBps
}

export function isAllocationComplete(a: OfferAllocation): boolean {
  return allocationSumBps(a) === 10_000
}

/* ── Cycle de vie ─────────────────────────────────────────────────────────
   Six états, dans l'ordre où ils surviennent. Chacun décrit une situation
   RÉELLE et observable, pas une étape d'un formulaire :

     draft      l'offre se prépare, rien n'est parti
     sent       le client l'a reçue, la balle est dans son camp
     accepted   il a dit oui, il faut lui ouvrir l'accès et appeler les fonds
     funding    les identifiants et le lien de virement sont partis
     funded     les fonds sont arrivés, le vault peut être ouvert
     active     le vault tourne — l'offre a fait son travail

   Deux sorties possibles à tout moment : `declined` (le client a dit non) et
   `expired` (l'offre a dépassé sa validité sans réponse). Les distinguer évite
   de compter un silence comme un refus. */

export const OFFER_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'funding',
  'funded',
  'active',
  'declined',
  'expired',
] as const

export type OfferStatus = (typeof OFFER_STATUSES)[number]

export const OFFER_STATUS_LABEL: Readonly<Record<OfferStatus, string>> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  funding: 'Awaiting funds',
  funded: 'Funds received',
  active: 'Vault active',
  declined: 'Declined',
  expired: 'Expired',
}

/** Les états qui demandent une action de notre côté, et laquelle. */
export const OFFER_NEXT_STEP: Readonly<Record<OfferStatus, string | null>> = {
  draft: 'Finish and send the offer',
  sent: null, // la balle est chez le client
  accepted: 'Issue credentials and request funds',
  funding: null, // on attend le virement
  funded: 'Open the vault',
  active: null,
  declined: null,
  expired: null,
}

/** Un état terminal ne mène plus nulle part : il sort du pipeline. */
export function isTerminal(status: OfferStatus): boolean {
  return status === 'active' || status === 'declined' || status === 'expired'
}

/** Les états qui pèsent dans le pipeline commercial, dans l'ordre d'avancement. */
export const PIPELINE_STATUSES: readonly OfferStatus[] = [
  'draft',
  'sent',
  'accepted',
  'funding',
  'funded',
]

/* ── Réponses au questionnaire d'entrée ───────────────────────────────────
   Les sept questions de qualification, telles que le client y répond. Toutes
   facultatives : une offre peut se créer avant que le questionnaire revienne,
   et un champ vide se dit `null` plutôt que de se deviner. */

export type Questionnaire = Readonly<{
  platformKind: string | null
  assetsUnderManagement: string | null
  fundsIdleOrEarning: string | null
  hasProductToday: string | null
  productInterest: string | null
  firstVaultSize: string | null
  launchTimeline: string | null
  submittedAt: string | null
}>

/* ── L'offre ──────────────────────────────────────────────────────────── */

export type OfferId = string & { readonly __brand: 'OfferId' }

/** Un courriel parti : depuis le Gmail de l'opérateur, consigné sur le contact et le deal HubSpot. */
export type SentEmail = Readonly<{
  emailId: string
  to: readonly string[]
  cc: readonly string[]
  subject: string
  sentAt: string
  gmailMessageId: string | null
  hubspotEngagementId: string | null
}>

export type Offer = Readonly<{
  id: OfferId
  /**
   * Le client à qui l'offre est faite — LA clé qui relie l'offre au KYC et au
   * vault. Facultative le temps que le backend la porte partout : à défaut, le
   * rattachement retombe sur le vault ouvert, puis sur le nom.
   */
  clientId?: string | null
  /** Nom court donné à l'offre, pour la retrouver. */
  reference: string
  clientName: string
  clientKind: ClientKind | null
  contactEmail: string | null
  /** Montant proposé, en USDC entiers — pas d'atomique ici, c'est un montant
   *  commercial saisi à la main, pas un solde lu sur la chaîne. */
  amountUsdc: number | null
  riskProfile: RiskProfile
  allocation: OfferAllocation
  /** Durée d'immobilisation proposée, en mois. */
  lockupMonths: number
  status: OfferStatus
  createdAt: string
  updatedAt: string
  sentAt: string | null
  decidedAt: string | null
  /** Qui a répondu : le client depuis sa proposition, ou l'admin qui consigne sa réponse. */
  acceptedBy?: 'client' | 'admin' | null
  /** Identifiants et lien de virement envoyés : les fonds sont appelés. */
  fundingRequestedAt?: string | null
  /** Le virement est arrivé — il attend son autorisation (une décision). */
  fundsReceivedAt?: string | null
  /** Le dépôt est autorisé : le vault peut s'ouvrir. */
  fundedAt?: string | null
  /** Le vault s'est ouvert. */
  openedAt?: string | null
  /**
   * Le compte Fireblocks du futur vault, ouvert à l'acceptation : son adresse
   * de dépôt est celle de l'appel de fonds. Tout ce qui déplace de l'argent
   * passe ensuite par Fireblocks.
   */
  fireblocks?: Readonly<{ vaultAccountId: string; asset: string; network: string; depositAddress: string }> | null
  /** Les courriels du parcours déjà envoyés (Gmail) et consignés dans HubSpot. */
  sentEmails?: readonly SentEmail[]
  /** Le vault ouvert au terme du parcours, quand il existe. */
  vaultId: string | null
  questionnaire: Questionnaire | null
  notes: string | null
}>

/** Ce que le tableau de bord lit : le pipeline, compté par état. */
export type OfferPipeline = Readonly<{
  counts: Readonly<Record<OfferStatus, number>>
  /** Somme des montants encore en jeu — les états non terminaux seulement. */
  openAmountUsdc: number
  /** Les offres qui attendent une action de notre côté. */
  needsAction: readonly Offer[]
}>

export type OffersRegistry = Readonly<{
  offers: Availability<readonly Offer[]>
}>

/** Compte le pipeline à partir d'une liste d'offres. */
export function buildPipeline(offers: readonly Offer[]): OfferPipeline {
  const counts = Object.fromEntries(OFFER_STATUSES.map((s) => [s, 0])) as Record<
    OfferStatus,
    number
  >
  let openAmountUsdc = 0
  const needsAction: Offer[] = []

  for (const offer of offers) {
    counts[offer.status] += 1
    if (!isTerminal(offer.status) && offer.amountUsdc !== null) {
      openAmountUsdc += offer.amountUsdc
    }
    if (OFFER_NEXT_STEP[offer.status] !== null) needsAction.push(offer)
  }

  return { counts, openAmountUsdc, needsAction }
}
