import type { EtatSerie } from '@/components/charts/core/chart-frame'

/**
 * Chart-frame state decision from a `Resolved` field returned by the
 * backend — shared by the product pages (BTC, factsheet…).
 */

export type ChampResolu<T = unknown> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/**
 * Codes de motif → phrase, pour les cadres en attente de source.
 *
 * Les clés sont les codes bruts du backend et ne changent pas ; seules les
 * phrases sont traduites, la console étant en français.
 */
export const MOTIF_SERIE: Record<string, string> = {
  dynavault_not_deployed: 'cette mesure n’est pas encore ouverte sur le contrat déployé',
  // Le contrat répond, mais n'expose aucune lecture pour cette donnée : un
  // nouveau déploiement n'y changera rien. À ne pas confondre avec le motif
  // ci-dessus.
  not_exposed_by_contract: 'le contrat n’expose aucune lecture pour cette donnée',
  no_custody_provider_integrated: 'aucun prestataire de conservation n’est intégré',
  not_available: 'la source n’est pas encore raccordée',
  not_configured: 'la source n’est pas encore configurée',
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
