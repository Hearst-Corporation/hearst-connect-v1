import {
  backendStateFrom,
  backendStateLabel,
  type BackendState,
} from '@/lib/backend/reading-state'
import type { Availability } from '@/lib/vaults/model'

/** @deprecated Use `BackendState` from `@/lib/backend/reading-state`. */
export type EtatBackend = 'EN_DIRECT' | 'HORS_LIGNE' | 'PROBLEME'

const TO_LEGACY: Record<BackendState, EtatBackend> = {
  LIVE: 'EN_DIRECT',
  OFFLINE: 'HORS_LIGNE',
  ISSUE: 'PROBLEME',
}

const FROM_LEGACY: Record<EtatBackend, BackendState> = {
  EN_DIRECT: 'LIVE',
  HORS_LIGNE: 'OFFLINE',
  PROBLEME: 'ISSUE',
}

/** @deprecated Use `backendStateFrom` from `@/lib/backend/reading-state`. */
export function etatBackend<T>(lecture: Availability<T>): EtatBackend {
  return TO_LEGACY[backendStateFrom(lecture)]
}

/** @deprecated Use `backendStateLabel` from `@/lib/backend/reading-state`. */
export function libelleEtatBackend(etat: EtatBackend): string {
  return backendStateLabel(FROM_LEGACY[etat])
}
