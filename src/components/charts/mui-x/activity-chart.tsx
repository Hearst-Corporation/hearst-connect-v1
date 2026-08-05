'use client'

import { chartHeight, chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { BarChart } from '@mui/x-charts/BarChart'
import { axisClasses } from '@mui/x-charts/ChartsAxis'

/**
 * MUI X adapter — activity over an ordered time domain, as bars.
 *
 * ── Why bars, and why a labelled unit ─────────────────────────────────────
 * Each point is a closed count (or amount) for one bucketed period: what was
 * recorded that day, independent of the next. Bars assert exactly that; a line
 * would draw a slope between two buckets that no one measured. The unit is named
 * by the caller because `recentActivityTrend` publishes TWO different series
 * depending on what the data supports — money moved, or a count of movements —
 * and the reader must be told which one they are looking at.
 *
 * ── What it never invents ─────────────────────────────────────────────────
 * It plots the ordered points it is handed. The caller only reaches this
 * component once the series holds ≥2 ordered points (`recentActivityTrend`
 * returns a named `PARTIAL / not_enough_ordered_points` absence otherwise), so a
 * lone bar floating in an empty canvas never happens here. No bucket is filled
 * at zero to close a gap in the calendar — an absent day is simply absent.
 */

export type PointActivite = {
  /** Bucket label on the x-axis (a day). */
  readonly label: string
  /** The measured quantity for that bucket. */
  readonly value: number
  /** Longer form of the bucket, for the tooltip. */
  readonly detail: string
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstActivityChart({ points, unite }: Readonly<{ points: readonly PointActivite[]; unite: string }>) {
  const height = chartHeight('columns', Math.max(points.length, 1))

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Activité par période, en {unite}</caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Valeur ({unite})</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.detail}>
                <th scope="row">{p.detail}</th>
                <td>{formatNumber(p.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" style={{ width: '100%', height }}>
        <BarChart
          dataset={points as { label: string; value: number; detail: string }[]}
          xAxis={[{ scaleType: 'band', dataKey: 'label' }]}
          series={[
            {
              dataKey: 'value',
              label: unite,
              color: SERIE,
              valueFormatter: (v) => (v === null ? '—' : `${formatNumber(v)} ${unite}`),
            },
          ]}
          margin={{ left: 48, right: 16, top: 12, bottom: 28 }}
          slotProps={{ legend: { hidden: true } as never }}
          sx={{
            [`& .${axisClasses.tickLabel}`]: {
              fontSize: chartTheme.axisFontSize,
              fill: chartTheme.tick,
            },
            [`& .${axisClasses.line}`]: { stroke: chartTheme.tick, strokeOpacity: 0.2 },
            [`& .${axisClasses.tick}`]: { stroke: chartTheme.tick, strokeOpacity: 0.2 },
            background: 'transparent',
          }}
        />
      </div>
    </div>
  )
}
