import 'server-only'

import { cookies } from 'next/headers'

/**
 * LE MONDE DU MOCK, gardé dans la session.
 *
 * Le backend de démonstration ne garde rien entre deux requêtes (sur Vercel,
 * chaque requête peut tomber sur une instance différente). Ce qui change —
 * décisions, offres et leurs étapes, KYC, vaults ouverts, horloge — revient
 * donc dans l'en-tête `x-demo-world` de ses réponses ; le front le garde dans
 * un cookie de session et le lui renvoie à chaque appel.
 *
 * Un vrai backend n'émet pas cet en-tête : le cookie n'existe alors jamais et
 * rien n'est envoyé. Le contenu n'est que de la donnée de démonstration.
 *
 * Découpé en morceaux : un cookie dépasse rarement 4 Ko, mais une démo longue
 * (plusieurs offres, des mois de décisions) peut y arriver.
 */

const NAME = 'hc_world'
const CHUNK = 3500
const MAX_CHUNKS = 8

export async function worldHeader(): Promise<Record<string, string>> {
  try {
    const jar = await cookies()
    const count = Number(jar.get(`${NAME}_n`)?.value ?? 0)
    if (!(count > 0)) return {}
    let value = ''
    for (let i = 0; i < count; i++) value += jar.get(`${NAME}_${i}`)?.value ?? ''
    return value === '' ? {} : { 'x-demo-world': value }
  } catch {
    return {}
  }
}

/** Garde le monde renvoyé par une ÉCRITURE. Hors action serveur (rendu), le
 *  cookie est en lecture seule : on n'écrit rien, sans erreur. */
export async function keepWorld(response: Response, sent: string | undefined, method: string): Promise<void> {
  const next = response.headers.get('x-demo-world')
  if (method === 'GET' || next === null || next === sent) return
  try {
    const jar = await cookies()
    const parts = next.match(new RegExp(`.{1,${CHUNK}}`, 'g')) ?? []
    if (parts.length > MAX_CHUNKS) return
    const options = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 14,
    }
    parts.forEach((part, i) => jar.set(`${NAME}_${i}`, part, options))
    for (let i = parts.length; i < MAX_CHUNKS; i++) if (jar.get(`${NAME}_${i}`)) jar.delete(`${NAME}_${i}`)
    jar.set(`${NAME}_n`, String(parts.length), options)
  } catch {
    // Rendu d'un composant serveur : les cookies ne s'y écrivent pas.
  }
}
