'use server'

import { revalidatePath } from 'next/cache'
import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'

/**
 * UNE DEMANDE DE RETRAIT, en bitcoin, vers le portefeuille du client.
 *
 * Le formulaire pré-valide ; le backend décide (ce qui est acquis, moins les
 * retraits déjà en attente). Rien ne sort avant la validation de l'admin : la
 * demande entre dans sa file, et le journal du client la montre « pending ».
 */

export type WithdrawalOutcome = Readonly<{ ok: boolean; error: string | null; btc: number | null }>

export async function requestWithdrawal(_prev: WithdrawalOutcome | null, form: FormData): Promise<WithdrawalOutcome> {
  if ((await getSession()) === null) return { ok: false, error: 'Session expired — sign in again.', btc: null }
  const btc = Number(String(form.get('amountBtc') ?? '').replace(',', '.'))
  if (!Number.isFinite(btc) || btc <= 0) return { ok: false, error: 'Enter an amount in BTC.', btc: null }
  const res = await callBackend('me-withdrawals', { body: { amountBtcSats: Math.round(btc * 1e8) } })
  if (!res.ok) return { ok: false, error: res.problem?.detail ?? 'The withdrawal could not be requested.', btc: null }
  revalidatePath('/account', 'layout')
  revalidatePath('/admin', 'layout')
  return { ok: true, error: null, btc }
}
