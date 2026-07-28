import type { EtatSerie } from '@/components/admin/chart-frame'

/**
 * Décision d’état d’un cadre graphique à partir d’un champ `Resolved`
 * renvoyé par le backend — partagée par les pages produit (BTC, factsheet…).
 */

export type ChampResolu<T = unknown> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/** Motifs machine → phrase, pour les cadres en attente de source. */
export const MOTIF_SERIE: Record<string, string> = {
  dynavault_not_deployed: 'cette mesure n’est pas encore ouverte sur le contrat déployé',
  // Le contrat répond, mais il n’expose aucune lecture de cette donnée : un
  // déploiement n’y changera rien. À ne pas confondre avec le motif ci-dessus.
  not_exposed_by_contract: 'le contrat n’expose aucune lecture de cette donnée',
  no_custody_provider_integrated: 'aucun dépositaire n’est encore intégré',
  not_available: 'la source n’est pas encore branchée',
  not_configured: 'la source n’est pas encore paramétrée',
  db_error: 'la base de données n’a pas répondu',
  rpc_error: 'la chaîne n’a pas répondu',
}

export function explicationSerie(
  bloc: ChampResolu | undefined,
  defaut: string,
  motifs: Record<string, string> = MOTIF_SERIE,
): string {
  const brut = bloc?.reason
  if (typeof brut !== 'string' || brut === '') return defaut
  return motifs[brut] ?? defaut
}

export function etatSerieDe(
  bloc: ChampResolu | undefined,
  defaut: string,
  motifs: Record<string, string> = MOTIF_SERIE,
): EtatSerie {
  if (bloc === undefined) return { type: 'attendue', explication: defaut }
  if (bloc.status === 'UNAVAILABLE' || bloc.status === 'ERROR') {
    return { type: 'indisponible', explication: explicationSerie(bloc, defaut, motifs) }
  }
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    return { type: 'attendue', explication: explicationSerie(bloc, defaut, motifs) }
  }
  return { type: 'tracee' }
}
