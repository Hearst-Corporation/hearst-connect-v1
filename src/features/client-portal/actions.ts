'use server'

import { revalidatePath } from 'next/cache'
import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'

/* Les gestes du client : retirer (vers un portefeuille autorisé), ajouter un
   portefeuille, choisir l'issue de son blocage, régler ses notifications,
   demander à investir davantage. Le backend décide ; son refus s'affiche tel quel. */

export type PortalOutcome = Readonly<{ ok: boolean; error: string | null }>

async function write(id: string, body: unknown): Promise<PortalOutcome> {
  if ((await getSession()) === null) return { ok: false, error: 'Session expired — sign in again.' }
  const res = await callBackend(id, { body })
  if (!res.ok) return { ok: false, error: res.problem?.detail ?? 'This could not be done.' }
  revalidatePath('/account', 'layout')
  revalidatePath('/admin', 'layout')
  return { ok: true, error: null }
}

export async function requestPortalWithdrawal(vaultId: string, walletId: string, amountBtc: number): Promise<PortalOutcome> {
  if (!Number.isFinite(amountBtc) || amountBtc <= 0) return { ok: false, error: 'Enter an amount in BTC.' }
  return write('me-withdrawals', { vaultId, walletId, amountBtcSats: Math.round(amountBtc * 1e8) })
}

export async function addWallet(label: string, network: string, address: string): Promise<PortalOutcome> {
  return write('me-wallet-add', { label, asset: network === 'Bitcoin' ? 'BTC' : 'USDC', network, address })
}

export async function setEndOfTerm(vaultId: string, choice: 'release' | 'renew' | 'undecided'): Promise<PortalOutcome> {
  return write('me-preferences-update', { endOfTerm: { [vaultId]: choice } })
}

export async function setNotification(key: string, on: boolean): Promise<PortalOutcome> {
  return write('me-preferences-update', { notifications: { [key]: on } })
}

export async function investMore(amountUsdc: number | null, note: string): Promise<PortalOutcome> {
  return write('me-invest', { amountUsdc, note })
}
