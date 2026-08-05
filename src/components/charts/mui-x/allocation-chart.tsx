'use client'

import { chartHeight, chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { BarChart } from '@mui/x-charts/BarChart'
import { axisClasses } from '@mui/x-charts/ChartsAxis'

/**
 * MUI X adapter — target vs. observed allocation, per pocket.
 *
 * ── What it shows, and what it refuses ────────────────────────────────────
 * Each pocket carries a TARGET share (basis points the contract aims to hold)
 * and, when the service reads it, an OBSERVED share. The chart draws the two as
 * a paired horizontal bar so the gap is read at a glance, per pocket — the exact
 * figures stay in the table beside it and in the screen-reader table below.
 *
 * A pocket whose observed share the service did not return is drawn with its
 * target bar ONLY: the observed bar is absent, never zero. Drawing 0 % would
 * assert the pocket holds nothing, which is a different claim from "not read".
 * The observed reading is documented as less trustworthy than the target
 * (backend `actualBps` can disagree with itself), so target is the reference bar
 * and observed is read against it — this component never derives a variance it
 * was not handed.
 *
 * Ordinary data (an allocation split is not an alarm): the two bars take the
 * mint measurement role and the neutral reference role from `chartTheme`,
 * never a semantic color.
 */

export type PosteAllocation = {
  /** Pocket label, as returned by the service. */
  readonly label: string
  /** Target share, in percent. */
  readonly ciblePct: number
  /** Observed share, in percent — `null` when the service did not read it. */
  readonly constatePct: number | null
}

const CIBLE = chartTheme.dataSeries.brandPrimary
const CONSTATE = chartTheme.dataSeries.dataReference

export function HearstAllocationChart({ postes }: Readonly<{ postes: readonly PosteAllocation[] }>) {
  const height = chartHeight('rows', Math.max(postes.length, 1))
  const anyConstate = postes.some((p) => p.constatePct !== null)

  return (
    <div className="px-5 pb-5 sm:px-6">
      <div className="sr-only">
        <table>
          <caption>Allocation cible et constatée par poche, en pourcentage</caption>
          <thead>
            <tr>
              <th scope="col">Poche</th>
              <th scope="col">Cible</th>
              <th scope="col">Constaté</th>
            </tr>
          </thead>
          <tbody>
            {postes.map((p) => (
              <tr key={p.label}>
                <th scope="row">{p.label}</th>
                <td>{formatChartPercent(p.ciblePct)}</td>
                <td>{p.constatePct === null ? 'non lu' : formatChartPercent(p.constatePct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div aria-hidden="true" style={{ width: '100%', height }}>
        <BarChart
          dataset={postes as { label: string; ciblePct: number; constatePct: number | null }[]}
          yAxis={[{ scaleType: 'band', dataKey: 'label' }]}
          series={[
            {
              dataKey: 'ciblePct',
              label: 'Cible',
              color: CIBLE,
              valueFormatter: (v) => formatChartPercent(v as number | null),
            },
            ...(anyConstate
              ? [
                  {
                    dataKey: 'constatePct',
                    label: 'Constaté',
                    color: CONSTATE,
                    valueFormatter: (v: number | null) => formatChartPercent(v),
                  },
                ]
              : []),
          ]}
          layout="horizontal"
          margin={{ left: 96, right: 24, top: 10, bottom: 24 }}
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
