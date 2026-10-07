import 'server-only'

import { getSession } from '@/lib/session'
import { loadSettings } from './load'
import type { TeamMember } from './schema'

/**
 * LES RÔLES DE L'ÉQUIPE, appliqués aux gestes.
 *
 * Le rôle d'un membre vit dans Settings → Team. Un Viewer lit, il n'agit pas ;
 * un membre suspendu ou seulement invité non plus. Chaque action serveur qui
 * ÉCRIT passe par ici avant d'appeler le backend — qui refait la vérification
 * de son côté (le front n'est jamais la seule barrière).
 *
 * Un membre absent de l'équipe (réglages illisibles, compte technique) n'est
 * pas bloqué ici : le backend reste l'autorité.
 */
export async function writeRefusal(): Promise<string | null> {
  const session = await getSession()
  if (session === null) return 'Session expired — sign in again.'
  const settings = await loadSettings()
  const team = (settings?.values.team ?? []) as TeamMember[]
  const me = team.find((m) => m.email.toLowerCase() === session.email.toLowerCase())
  if (!me) return null
  if (me.status !== 'active') return `Your access is ${me.status} — ask an admin to activate it.`
  if (me.role === 'Viewer') return 'Your role (Viewer) is read-only — ask an admin for a role that can act.'
  return null
}
