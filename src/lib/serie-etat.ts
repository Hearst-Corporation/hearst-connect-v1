import type { EtatSerie } from '@/components/admin/chart-frame'

/**
 * Chart-frame state decision from a `Resolved` field returned by the
 * backend — shared by the product pages (BTC, factsheet…).
 */

export type ChampResolu<T = unknown> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/** Machine reasons → sentence, for frames waiting on a source. */
export const MOTIF_SERIE: Record<string, string> = {
  dynavault_not_deployed: 'this measure is not open yet on the deployed contract',
  // The contract responds, but exposes no read for this data: a new
  // deployment won't change that. Not to be confused with the reason above.
  not_exposed_by_contract: 'the contract exposes no read for this data',
  no_custody_provider_integrated: 'no custody provider is integrated yet',
  not_available: 'the source is not wired up yet',
  not_configured: 'the source is not configured yet',
  db_error: 'the database did not respond',
  rpc_error: 'the chain did not respond',
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
