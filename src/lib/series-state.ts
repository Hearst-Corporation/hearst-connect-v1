import type { SeriesState } from '@/components/charts/core/chart-frame'

/**
 * Chart-frame state decision from a `Resolved` field returned by the
 * backend — shared by the product pages (BTC, factsheet…).
 */

export type ResolvedField<T = unknown> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

/**
 * Backend reason codes → user-facing explanation for pending-series frames.
 *
 * Keys are raw backend codes and do not change; only the phrases are translated.
 */
export const SERIES_REASON: Record<string, string> = {
  dynavault_not_deployed: 'this measure is not yet exposed on the deployed contract',
  not_exposed_by_contract: 'the contract exposes no reading for this data point',
  no_custody_provider_integrated: 'no custody provider is integrated',
  not_available: 'the source is not wired yet',
  not_configured: 'the source is not configured yet',
  db_error: 'the database did not respond',
  rpc_error: 'the chain did not respond',
}

export function seriesExplanation(
  block: ResolvedField | undefined,
  fallback: string,
  reasons: Record<string, string> = SERIES_REASON,
): string {
  const raw = block?.reason
  if (typeof raw !== 'string' || raw === '') return fallback
  return reasons[raw] ?? fallback
}

export function seriesStateFrom(
  block: ResolvedField | undefined,
  fallback: string,
  reasons: Record<string, string> = SERIES_REASON,
): SeriesState {
  if (block === undefined) return { type: 'pending', explanation: fallback }
  if (block.status === 'UNAVAILABLE' || block.status === 'ERROR') {
    return { type: 'unavailable', explanation: seriesExplanation(block, fallback, reasons) }
  }
  if (block.status !== 'LIVE' || block.value === null) {
    return { type: 'pending', explanation: seriesExplanation(block, fallback, reasons) }
  }
  return { type: 'plotted' }
}
