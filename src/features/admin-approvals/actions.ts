'use server'

import { revalidatePath } from 'next/cache'
import { callBackend } from '@/lib/backend/client'
import { getSession } from '@/lib/session'

/**
 * La décision d'un admin sur un élément en attente : un dépôt, une
 * distribution, un retrait, un rééquilibrage proposé, un changement de
 * protocole. Rien ne s'exécute tant qu'elle n'est pas prise — le keeper
 * n'agit qu'APRÈS une approbation enregistrée ici.
 */

export type DecisionOutcome = Readonly<{ ok: boolean; error: string | null; decision: 'approve' | 'decline' | null }>

export async function decideApproval(_prev: DecisionOutcome | null, form: FormData): Promise<DecisionOutcome> {
  if ((await getSession()) === null) return { ok: false, error: 'Session expired — sign in again.', decision: null }
  const id = String(form.get('id') ?? '')
  const decision = form.get('decision') === 'decline' ? 'decline' : 'approve'
  if (id === '') return { ok: false, error: 'Missing item.', decision: null }

  const res = await callBackend<{ decision: string }>('admin-approval-decide', {
    params: { id },
    body: { decision },
  })
  if (!res.ok) return { ok: false, error: res.state.reason ?? 'The decision could not be recorded.', decision: null }

  // Le tableau de bord, la cloche, la fiche du client : tout relit la file.
  revalidatePath('/admin', 'layout')
  return { ok: true, error: null, decision }
}
