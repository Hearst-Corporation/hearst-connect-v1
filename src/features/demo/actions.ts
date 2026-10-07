'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'

/* ── LA DÉMO GUIDÉE ─────────────────────────────────────────────────────────
   Les gestes que le panneau de démo joue lui-même : démarrer, simuler la
   décision de Sumsub (le partenaire KYC/AML), avancer l'horloge, réinitialiser.
   Tout le reste du parcours se fait dans le produit, avec ses vrais boutons. */

export type DemoOutcome = Readonly<{ ok: boolean; error: string | null }>

async function run(id: Parameters<typeof callBackend>[0], options: Parameters<typeof callBackend>[1]): Promise<DemoOutcome> {
  if ((await getSession()) === null) return { ok: false, error: 'Session expired — sign in again.' }
  const res = await callBackend(id, options)
  if (!res.ok) return { ok: false, error: res.problem?.detail ?? 'The demo backend refused this step.' }
  revalidatePath('/', 'layout')
  return { ok: true, error: null }
}

export async function startDemo(_prev: DemoOutcome | null, form: FormData): Promise<DemoOutcome> {
  const clientName = String(form.get('clientName') ?? '').trim() || 'Orbit Capital'
  const out = await run('demo-start', { body: { clientName } })
  if (!out.ok) return out
  // Le premier geste : préparer l'offre de ce prospect.
  redirect(`/admin/offers/new?client=${encodeURIComponent(clientName)}`)
}

export async function resetDemo(_prev: DemoOutcome | null): Promise<DemoOutcome> {
  const out = await run('demo-reset', {})
  if (!out.ok) return out
  redirect('/admin')
}

export async function advanceClock(_prev: DemoOutcome | null, form: FormData): Promise<DemoOutcome> {
  return run('demo-clock', { body: { months: Number(form.get('months')) || 1 } })
}

/** La décision de Sumsub — en production elle arrive du partenaire, jamais de la console. */
export async function clearKyc(_prev: DemoOutcome | null, form: FormData): Promise<DemoOutcome> {
  const id = String(form.get('clientId') ?? '')
  if (id === '') return { ok: false, error: 'No client yet.' }
  return run('admin-client-kyc', { params: { id }, body: { kyc: 'APPROVED', aml: 'CLEAR' } })
}
