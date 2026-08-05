import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'

/**
 * Les trois états utilisateur imposés par HC-ENDPOINT-ONLY-UI-001.
 *
 * EN_DIRECT  — requête réussie, donnée LIVE, fraîcheur non stale.
 * HORS_LIGNE — source inaccessible, non configurée, ou absence de connexion.
 * PROBLEME   — erreur, permission, STALE/PARTIAL, contrat inattendu.
 */

export type EtatBackend = 'EN_DIRECT' | 'HORS_LIGNE' | 'PROBLEME'

const HORS_LIGNE: ReadonlySet<string> = new Set(['UNAVAILABLE', 'NOT_CONFIGURED', 'NOT_EXPOSED'])

export function etatBackend<T>(lecture: Availability<T>): EtatBackend {
  if (!isAvailable(lecture)) {
    return HORS_LIGNE.has(lecture.status) ? 'HORS_LIGNE' : 'PROBLEME'
  }
  const signal = signalOf(lecture)
  if (signal === 'live') return 'EN_DIRECT'
  if (signal === 'stale') return 'PROBLEME'
  return 'EN_DIRECT'
}

export function libelleEtatBackend(etat: EtatBackend): string {
  switch (etat) {
    case 'EN_DIRECT':
      return 'En direct'
    case 'HORS_LIGNE':
      return 'Hors ligne'
    case 'PROBLEME':
      return 'Problème'
  }
}
