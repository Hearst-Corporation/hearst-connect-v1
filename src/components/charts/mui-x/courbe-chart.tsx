'use client'

import { chartHeight, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { axisClasses } from '@mui/x-charts/ChartsAxis'
import { LineChart } from '@mui/x-charts/LineChart'

/**
 * MUI X adapter — a rate curve read over an ordered domain (months).
 *
 * ── Why a step line, not a smooth one ─────────────────────────────────────
 * A vending / remuneration curve is a schedule: the rate applicable at month N
 * holds until month N+1, where it jumps. A smoothed spline between two milestones
 * would draw a rate the schedule never sets — a value nobody agreed to. So the
 * interpolation is `stepAfter`: each segment asserts only the rate that was
 * actually recorded for its month.
 *
 * ── What it never invents ─────────────────────────────────────────────────
 * It plots exactly the points it is handed. A month with no recorded rate is
 * absent from the input (the caller's mapper drops it) — it is never drawn at
 * zero, which would read as a real "0 %" milestone. Below two points there is no
 * curve to read: the caller renders `SingleObservation` or a named absence via
 * `ChartFrame`, and this component is not asked to draw.
 *
 * The measured quantity is ordinary data (a rate carries no state), so it takes
 * the ordinary-data role from `chartTheme.dataSeries` — never a semantic color.
 */

export type PointCourbe = {
  /** Ordinal domain position — the product milestone month. */
  readonly mois: number
  /** The recorded rate at that month, in percent. */
  readonly taux: number
}

const SERIE = chartTheme.dataSeries.brandPrimary

export function HearstCourbeChart({
  points,
  domaineLabel = 'Mois',
}: Readonly<{ points: readonly PointCourbe[]; domaineLabel?: string }>) {
  const ordonnes = [...points].sort((a, b) => a.mois - b.mois)
  const height = chartHeight('line', Math.max(ordonnes.length, 1))

  return (
    <div className="px-5 pb-5 sm:px-6">
      {/* The only reading available to screen readers and keyboard nav — it
          carries the exact figure the axis rounds. Wrapped in a div, not the
          table itself: a <table> ignores width clamps and sizes to content. */}
      <div className="sr-only">
        <table>
          <caption>Taux de rémunération par mois-jalon du produit</caption>
          <thead>
            <tr>
              <th scope="col">{domaineLabel}</th>
              <th scope="col">Taux</th>
            </tr>
          </thead>
          <tbody>
            {ordonnes.map((p) => (
              <tr key={p.mois}>
                <th scope="row">
                  {domaineLabel} {p.mois}
                </th>
                <td>{formatChartPercent(p.taux)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" style={{ width: '100%', height }}>
        <LineChart
          dataset={ordonnes as { mois: number; taux: number }[]}
          xAxis={[
            {
              dataKey: 'mois',
              scaleType: 'point',
              valueFormatter: (v: number) => `${domaineLabel} ${v}`,
            },
          ]}
          series={[
            {
              dataKey: 'taux',
              curve: 'stepAfter',
              color: SERIE,
              showMark: true,
              valueFormatter: (v) => formatChartPercent(v),
            },
          ]}
          margin={{ left: 48, right: 24, top: 12, bottom: 28 }}
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
