'use server'

import { revalidatePath } from 'next/cache'
import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'
import { writeRefusal } from '@/lib/settings/roles'

/* ── LES CHANGEMENTS DE RÉGLAGES ────────────────────────────────────────────
   Une modification ne s'applique jamais à l'enregistrement : elle devient une
   demande, qu'un AUTRE membre approuve, puis attend le délai de sa section.
   Le backend est l'autorité de chaque règle ; son refus s'affiche tel quel. */

export type SettingsOutcome = Readonly<{ ok: boolean; error: string | null }>

export async function requestChange(section: string, value: unknown, reason: string): Promise<SettingsOutcome> {
  const session = await getSession()
  if (session === null) return { ok: false, error: 'Session expired — sign in again.' }
  const refused = await writeRefusal()
  if (refused) return { ok: false, error: refused }
  const res = await callBackend('admin-settings-change', {
    body: { section, value, reason, author: session.email },
  })
  if (!res.ok) return { ok: false, error: res.problem?.detail ?? 'The change could not be requested.' }
  revalidatePath('/admin', 'layout')
  return { ok: true, error: null }
}

/**
 * Décider d'une demande. `by` nomme le membre qui décide : en production c'est
 * l'utilisateur connecté (son jeton) ; la démo n'a qu'une session, elle choisit
 * donc le membre qui approuve — pour montrer la règle des quatre yeux.
 */
export async function decideChange(id: string, decision: 'approve' | 'reject' | 'cancel', by: string): Promise<SettingsOutcome> {
  const session = await getSession()
  if (session === null) return { ok: false, error: 'Session expired — sign in again.' }
  const res = await callBackend('admin-settings-decision', {
    params: { id },
    body: { decision, by: by || session.email },
  })
  if (!res.ok) return { ok: false, error: res.problem?.detail ?? 'The decision was refused.' }
  revalidatePath('/admin', 'layout')
  return { ok: true, error: null }
}
