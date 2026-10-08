'use client'

import { miningNoteRoutes, type MonteCarloResult, type SensitivityResponse } from '@/lib/mining-note'
import { formatNumber } from '@/lib/format'
import { useState } from 'react'
import { FanChart, type FanRow } from './fan-chart'
import clsx from 'clsx'

/**
 * Risk explorer — Monte-Carlo (fan chart + note-value KPIs) and the
 * sensitivity heatmap, both behind explicit runs: the MC sim is capped at
 * 5000 paths server-side, the sensitivity grid is 99 simulations and takes
 * seconds. Everything is fetched client-side through the same-origin
 * tunnels (`next.config.mjs` rewrites).
 */

const ACTION_CLASS =
  'inline-flex items-center gap-2 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60'

const KPI_LABEL_CLASS = 'text-[11px] font-medium text-fg-secondary'
const KPI_VALUE_CLASS = 'mt-1 text-xl font-semibold tracking-tight text-fg tabular-nums'

type Status = 'idle' | 'loading' | 'done' | 'error'

export function MonteCarloPanel() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MonteCarloResult | null>(null)

  async function run() {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(miningNoteRoutes.monteCarlo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot: 100_000, drift: 0, volatility: 0.6, months: 24, paths: 500, seed: 42 }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error ?? `HTTP ${res.status}`)
      setResult(json.data as MonteCarloResult)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Monte-Carlo simulation failed')
      setStatus('error')
    }
  }

  const rows: FanRow[] = result === null
    ? []
    : result.percentiles.p5.map((p5, i) => ({
        month: i + 1,
        p5,
        p25: result.percentiles.p25[i] ?? p5,
        p50: result.percentiles.p50[i] ?? p5,
        p75: result.percentiles.p75[i] ?? p5,
        p95: result.percentiles.p95[i] ?? p5,
      }))

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-fg-tertiary">
          {result === null
            ? '500 GBM paths at $100k spot — bands are BTC price, not note value.'
            : `${result.params.paths} paths · drift ${result.params.drift} · vol ${result.params.volatility} · seed ${result.params.seed}`}
        </p>
        <button type="button" className={ACTION_CLASS} onClick={() => void run()} disabled={status === 'loading'}>
          {status === 'loading' ? 'Simulating…' : result === null ? 'Run Monte-Carlo' : 'Re-run'}
        </button>
      </div>

      {status === 'error' ? <p className="text-xs text-danger-400">{error}</p> : null}

      <FanChart rows={rows} />

      {result !== null ? (
        <dl className="grid grid-cols-2 gap-3 @[40rem]:grid-cols-4">
          <div>
            <dt className={KPI_LABEL_CLASS}>P(capital back)</dt>
            <dd className={KPI_VALUE_CLASS}>
              {formatNumber(result.capitalBackProbability * 100, { maximumFractionDigits: 0 })}%
            </dd>
          </div>
          <div>
            <dt className={KPI_LABEL_CLASS}>Median exit (note value)</dt>
            <dd className={KPI_VALUE_CLASS}>${formatNumber(result.medianExit, { notation: 'compact', maximumFractionDigits: 1 })}</dd>
          </div>
          <div>
            <dt className={KPI_LABEL_CLASS}>CVaR 5%</dt>
            <dd className={KPI_VALUE_CLASS}>${formatNumber(result.cvar5, { notation: 'compact', maximumFractionDigits: 1 })}</dd>
          </div>
          <div>
            <dt className={KPI_LABEL_CLASS}>Avg. curtailed months</dt>
            <dd className={KPI_VALUE_CLASS}>{formatNumber(result.avgCurtailmentMonths, { maximumFractionDigits: 1 })}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

/* ── Sensitivity heatmap ─────────────────────────────────────────────────── */

function cellColor(value: number, metric: SensitivityResponse['metric']): string {
  // capitalBack → probability 0..1; medianReturn → USD net releasable on a
  // $1M note (1.0 = breakeven). Mapped to a single mint ramp (dark → accent).
  const raw = metric === 'capitalBack'
    ? value
    : Math.min(Math.max((value - 500_000) / 2_500_000, 0), 1)
  const opacity = 0.08 + raw * 0.8
  return `color-mix(in oklab, var(--color-accent-400) ${Math.round(opacity * 100)}%, transparent)`
}

export function SensitivityPanel() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SensitivityResponse | null>(null)
  const [metric, setMetric] = useState<SensitivityResponse['metric']>('capitalBack')

  async function run(nextMetric: SensitivityResponse['metric']) {
    setMetric(nextMetric)
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(miningNoteRoutes.sensitivity, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: nextMetric }),
      })
      const json = await res.json()
      if (!res.ok || json.success === false) throw new Error(json.error ?? `HTTP ${res.status}`)
      setResult(json as SensitivityResponse)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sensitivity grid failed')
      setStatus('error')
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-tertiary">
          11 drifts × 9 volatilities — 99 simulations, expect a few seconds.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={ACTION_CLASS}
            onClick={() => void run('capitalBack')}
            disabled={status === 'loading'}
          >
            {status === 'loading' && metric === 'capitalBack' ? 'Computing…' : 'P(capital back)'}
          </button>
          <button
            type="button"
            className={ACTION_CLASS}
            onClick={() => void run('medianReturn')}
            disabled={status === 'loading'}
          >
            {status === 'loading' && metric === 'medianReturn' ? 'Computing…' : 'Median net releasable'}
          </button>
        </div>
      </div>

      {status === 'error' ? <p className="text-xs text-danger-400">{error}</p> : null}

      {result === null ? (
        <p className="py-5 text-sm text-fg-tertiary">Pick a metric above to compute the grid.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0.5 text-[11px] tabular-nums">
            <thead>
              <tr>
                <th className="px-1.5 py-1 text-left font-medium text-fg-tertiary">drift \ vol</th>
                {result.vols.map((v) => (
                  <th key={v} className="px-1.5 py-1 text-right font-medium text-fg-tertiary">
                    {formatNumber(v * 100, { maximumFractionDigits: 0 })}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.drifts.map((d, di) => (
                <tr key={d}>
                  <th className={clsx('whitespace-nowrap px-1.5 py-1 text-left font-medium text-fg-tertiary')}>
                    {formatNumber(d * 100, { maximumFractionDigits: 0 })}%
                  </th>
                  {result.vols.map((v, vi) => {
                    const value = result.grid[di]?.[vi] ?? 0
                    const label =
                      result.metric === 'capitalBack'
                        ? `${formatNumber(value * 100, { maximumFractionDigits: 0 })}%`
                        : `$${formatNumber(value, { notation: 'compact', maximumFractionDigits: 1 })}`
                    return (
                      <td
                        key={v}
                        title={`drift ${d}, vol ${v} → ${label}`}
                        className="rounded-sm px-1.5 py-1.5 text-right font-medium text-fg"
                        style={{ backgroundColor: cellColor(value, result.metric) }}
                      >
                        {label}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
