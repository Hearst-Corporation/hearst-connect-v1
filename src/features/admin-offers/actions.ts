'use server'

import { redirect } from 'next/navigation'
import type { BackendResolved } from '@/lib/admin-dashboard/cache'
import type { OfferSimulation } from '@/lib/admin-dashboard/contracts'
import { loadOfferSimulation } from '@/lib/admin-dashboard/load'
import { callBackend } from '@/lib/backend/client'
import { MIN_VAULT_USDC, type Offer } from '@/lib/offers/model'
import { getSession } from '@/lib/session'

/* ── La simulation d'un brouillon ────────────────────────────────────────────
   Le MÊME moteur que la fiche d'offre et que la projection du client : la
   simulation calcule sur les paramètres passés, l'identifiant ne sert qu'à
   router. Le formulaire peut donc projeter une offre AVANT qu'elle existe —
   et la propale signée montrera exactement ce que le formulaire a montré. */

export type DraftSimulation =
  | Readonly<{ ok: true; simulation: OfferSimulation }>
  | Readonly<{ ok: false; reason: string }>

export async function simulateDraft(
  params: Readonly<{
    amountUsdc: number
    months: number
    miningBps: number
    lendingBps: number
    stableBps: number
  }>,
): Promise<DraftSimulation> {
  if ((await getSession()) === null) return { ok: false, reason: 'Session expired — sign in again.' }
  if (!(params.amountUsdc > 0)) return { ok: false, reason: 'Enter an amount to project.' }
  if (params.amountUsdc < MIN_VAULT_USDC) {
    return { ok: false, reason: `A vault starts at ${MIN_VAULT_USDC.toLocaleString('en-US')} USDC.` }
  }
  if (params.miningBps + params.lendingBps + params.stableBps !== 10_000) {
    return { ok: false, reason: 'The three pockets must total 100 % before projecting.' }
  }

  const result = await loadOfferSimulation('draft', params)
  if (result.kind !== 'available') {
    return { ok: false, reason: result.reason ?? 'The simulation engine did not answer.' }
  }
  return { ok: true, simulation: result.value }
}

/* ── La création ────────────────────────────────────────────────────────────
   Le formulaire pré-valide pour l'opérateur ; le backend reste l'autorité, et
   son refus s'affiche tel quel. Une offre créée naît en BROUILLON : rien ne
   part au client tant que personne ne l'envoie. */

export type CreateOfferState = Readonly<{ error: string | null }>

function whole(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw.replace(/[\s ',$]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

export async function createOffer(_prev: CreateOfferState, form: FormData): Promise<CreateOfferState> {
  if ((await getSession()) === null) return { error: 'Session expired — sign in again.' }

  const clientName = String(form.get('clientName') ?? '').trim()
  const amountUsdc = whole(form.get('amountUsdc'))
  const lockupMonths = whole(form.get('lockupMonths'))
  const miningBps = Math.round((whole(form.get('miningPct')) ?? 0) * 100)
  const lendingBps = Math.round((whole(form.get('lendingPct')) ?? 0) * 100)
  const stableBps = Math.round((whole(form.get('stablePct')) ?? 0) * 100)

  if (clientName === '') return { error: 'Enter the client name.' }
  if (amountUsdc === null || amountUsdc <= 0) return { error: 'Enter an amount in USDC.' }
  if (amountUsdc < MIN_VAULT_USDC) {
    return { error: `A vault starts at ${MIN_VAULT_USDC.toLocaleString('en-US')} USDC — this amount cannot open one.` }
  }
  if (lockupMonths === null || lockupMonths <= 0) return { error: 'Enter a lockup in months.' }
  if (miningBps + lendingBps + stableBps !== 10_000) {
    return { error: 'The three pockets must total 100 %.' }
  }

  const riskProfile = String(form.get('riskProfile') ?? '')
  const res = await callBackend<{ offer: BackendResolved<Offer> }>('admin-offer-create', {
    body: {
      clientName,
      clientId: String(form.get('clientId') ?? '') || null,
      reference: String(form.get('reference') ?? '').trim() || null,
      contactEmail: String(form.get('contactEmail') ?? '').trim() || null,
      clientKind: String(form.get('clientKind') ?? '') || null,
      amountUsdc: Math.round(amountUsdc),
      lockupMonths: Math.round(lockupMonths),
      // « Custom » n'est pas un profil backend : la grille la plus proche
      // n'existe pas, l'allocation saisie fait foi.
      riskProfile: ['conservative', 'balanced', 'growth'].includes(riskProfile) ? riskProfile : 'balanced',
      allocation: { miningBps, lendingBps, stableBps },
    },
  })

  if (!res.ok) {
    return { error: res.problem?.detail ?? 'The offer could not be created — the backend did not accept it.' }
  }
  const created = res.data.offer?.value
  if (!created?.id) return { error: 'The backend answered without an offer identifier.' }

  /* Retour sur la fiche du client : c'est là que vit son offre, avec sa
     projection, son PDF et ses courriels. */
  redirect(created.clientId ? `/admin/clients/${created.clientId}` : `/admin/offers/${created.id}`)
}
