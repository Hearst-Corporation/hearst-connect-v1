import type { SeriesState } from '@/components/charts/core/chart-frame'

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
 * Backend reason codes → user-facing explanation for pending-series frames.
 *
 * Keys are raw backend codes and do not change; only the phrases are translated.
 */
export const MOTIF_SERIE: Record<string, string> = {
  dynavault_not_deployed: 'this measure is not yet exposed on the deployed contract',
  not_exposed_by_contract: 'the contract exposes no reading for this data point',
  no_custody_provider_integrated: 'no custody provider is integrated',
  not_available: 'the source is not wired yet',
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

export function seriesStateFrom(
  bloc: ChampResolu | undefined,
  defaut: string,
  motifs: Record<string, string> = MOTIF_SERIE,
): SeriesState {
  if (bloc === undefined) return { type: 'pending', explication: defaut }
  if (bloc.status === 'UNAVAILABLE' || bloc.status === 'ERROR') {
    return { type: 'unavailable', explication: explicationSerie(bloc, defaut, motifs) }
  }
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    return { type: 'pending', explication: explicationSerie(bloc, defaut, motifs) }
  }
  return { type: 'plotted' }
}

/** @deprecated Use `seriesStateFrom` */
export const etatSerieDe = seriesStateFrom
