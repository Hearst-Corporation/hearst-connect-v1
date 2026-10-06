import { approvalAmount, btcFromSats } from '@/lib/admin-dashboard/amounts'
import 'server-only'

import { isVaultDrifting } from '@/lib/admin-dashboard/contracts'
import { DUE_SOON_MONTHS, loadClientBook, type ClientEntry } from '@/lib/clients/book'
import { formatCurrency, formatDate } from '@/lib/format'

/**
 * La boîte de réception de l'admin — tout ce qui demande son attention, au même
 * endroit, comme les notifications d'une application bancaire.
 *
 * Deux natures, jamais confondues :
 *   action  quelque chose ATTEND un geste de notre part (une décision, un
 *           rééquilibrage, un renouvellement, une étape d'offre) ;
 *   info    quelque chose S'EST passé et mérite d'être su (un nouveau
 *           prospect, une réponse client, des fonds reçus, un KYC qui bloque).
 *
 * Tout se dérive du registre des clients : la cloche dit ce que la page
 * Clients dit, ni plus ni moins — pas une seconde source de vérité.
 */

export type InboxKind =
  | 'deposit'
  | 'withdrawal'
  | 'distribution'
  | 'rebalance'
  | 'protocol'
  | 'lockup'
  | 'offer'
  | 'client'
  | 'funds'
  | 'kyc'

export type InboxItem = Readonly<{
  id: string
  kind: InboxKind
  severity: 'action' | 'info'
  title: string
  detail: string
  clientName: string
  /** Quand c'est arrivé, si on le sait — pour l'ordre et l'horodatage. */
  at: string | null
  href: string
}>

const usd = (v: number | null) => (v === null ? '' : formatCurrency(String(Math.round(v)), { unit: '$', fromAtomic: 1 }))
const DAY = 86_400_000
/** Un prospect est « nouveau » pendant une semaine. */
const NEW_FOR_MS = 7 * DAY

function itemsFor(e: ClientEntry): InboxItem[] {
  const href = e.clientId.startsWith('offer:') ? `/admin/offers/${e.clientId.slice(6)}` : `/admin/clients/${e.clientId}`
  const base = { clientName: e.name, href }
  const items: InboxItem[] = []

  // ── Les décisions : elles bloquent l'argent d'un client.
  for (const d of e.decisions) {
    const title =
      d.kind === 'deposit'
        ? 'Deposit to authorise'
        : d.kind === 'withdrawal'
          ? 'Withdrawal to process'
          : d.kind === 'rebalance'
            ? 'Rebalance to approve'
            : d.kind === 'protocol'
              ? 'Protocol change to approve'
              : 'Distribution to sign off'
    items.push({
      ...base,
      id: `decision:${d.id}`,
      kind: d.kind,
      severity: 'action',
      title,
      detail: `${e.name} · ${approvalAmount(d)}${d.note ? ` · ${d.note}` : ''}`,
      at: d.requestedAt,
      // Droit à la section de la fiche où cette décision a son contexte.
      href: `${href}${d.kind === 'distribution' ? '#rewards' : d.kind === 'rebalance' || d.kind === 'protocol' ? '#allocation' : '#decisions'}`,
    })
  }

  // ── Le vault : dérive hors bande, fin de lockup.
  const v = e.vault
  if (e.stage === 'active' && v !== null) {
    // Hors bande SANS proposition en attente : sinon la décision ci-dessus suffit.
    if (isVaultDrifting(v) && !e.decisions.some((d) => d.kind === 'rebalance')) {
      items.push({
        ...base,
        id: `rebalance:${v.vaultId}`,
        href: `${href}#allocation`,
        kind: 'rebalance',
        severity: 'action',
        title: 'Vault out of its band',
        detail: `${e.name} · drift ${((v.worstDriftBps ?? 0) / 100).toFixed(2)} pt — rebalance`,
        at: null,
      })
    }
    if (v.lockupEndAt !== null) {
      const left = (Date.parse(v.lockupEndAt) - Date.now()) / (30.44 * DAY)
      if (left <= DUE_SOON_MONTHS) {
        items.push({
          ...base,
          id: `lockup:${v.vaultId}`,
          kind: 'lockup',
          severity: 'action',
          title: left <= 0 ? 'Lockup ended' : 'Lockup ending soon',
          detail: `${e.name} · ${btcFromSats((v.capitalBtcSats ?? 0) + (v.accruedBtcSats ?? 0))} reserve unlocks ${formatDate(v.lockupEndAt)} — prepare the renewal`,
          at: v.lockupEndAt,
        })
      }
    }
  }

  // ── L'offre : l'étape suivante du parcours, ou ce qui vient d'arriver.
  const o = e.offer
  if (o !== null) {
    const amount = usd(o.amountUsdc)
    if (o.status === 'draft') {
      items.push({ ...base, href: `${href}#offer`, id: `offer:${o.id}:draft`, kind: 'offer', severity: 'action', title: 'Offer to finish and send', detail: `${e.name} · ${amount} draft`, at: o.updatedAt })
    } else if (o.status === 'accepted') {
      const kycOk = ['APPROVED', 'VERIFIED'].includes((e.kycStatus ?? '').toUpperCase())
      items.push(
        kycOk
          ? { ...base, href: `${href}#offer`, id: `offer:${o.id}:accepted`, kind: 'offer', severity: 'action', title: 'Offer accepted — call the funds', detail: `${e.name} · issue credentials and the ${amount} funding link`, at: o.decidedAt ?? o.updatedAt }
          : { ...base, id: `offer:${o.id}:kyc`, kind: 'kyc', severity: 'info', title: 'KYC pending with Som', detail: `${e.name} accepted ${amount} — funds cannot be called until Som approves`, at: o.decidedAt ?? o.updatedAt },
      )
    } else if (o.status === 'funded') {
      items.push({ ...base, href: `${href}#offer`, id: `offer:${o.id}:funded`, kind: 'funds', severity: 'action', title: 'Funds received — open the vault', detail: `${e.name} · ${amount} arrived`, at: o.updatedAt })
    } else if (o.status === 'declined' || o.status === 'expired') {
      items.push({ ...base, id: `offer:${o.id}:${o.status}`, kind: 'offer', severity: 'info', title: o.status === 'declined' ? 'Offer declined' : 'Offer expired', detail: `${e.name} · ${amount}${o.notes ? ` — “${o.notes}”` : ''}`, at: o.decidedAt ?? o.updatedAt })
    }

    // Un client né récemment : un nouveau prospect est une information.
    if (Date.now() - Date.parse(o.createdAt) < NEW_FOR_MS && e.stage !== 'active') {
      items.push({ ...base, id: `client:${e.clientId}:new`, kind: 'client', severity: 'info', title: 'New client', detail: `${e.name} · first offer ${amount}`, at: o.createdAt })
    }
  }

  return items
}

export async function loadAdminInbox(): Promise<readonly InboxItem[]> {
  const book = await loadClientBook()
  const items = book.entries.flatMap(itemsFor)
  // Ce qui attend un geste d'abord, puis le plus récent.
  return items.sort(
    (a, b) =>
      Number(b.severity === 'action') - Number(a.severity === 'action') ||
      (b.at ? Date.parse(b.at) : 0) - (a.at ? Date.parse(a.at) : 0),
  )
}
