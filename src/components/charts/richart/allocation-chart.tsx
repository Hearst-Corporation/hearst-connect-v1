'use client'

import { chartTheme, formatChartPercent } from '@/components/charts/core/chart-theme'
import { ChartAccessibilityTable } from '@/components/charts/richart/_shared/chart-accessibility-table'
import { formatNumber } from '@/lib/format'

/**
 * richart — target vs actual allocation, bullet rows.
 *
 * Pure CSS, no chart engine: each pocket is a track carrying the measured
 * exposure (mint fill) and the target (marker tick), with the drift readout
 * on the right. A pocket without an actual reading shows the target marker
 * only — never a made-up 0%.
 */

export type AllocationItem = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}

function driftOf(item: AllocationItem): number | null {
  if (item.actualPct === null) return null
  return item.actualPct - item.targetPct
}

function driftTone(drift: number | null): string {
  if (drift === null) return 'text-fg-tertiary'
  const abs = Math.abs(drift)
  if (abs < 1) return 'text-fg-tertiary'
  if (abs < 5) return 'text-warning-400'
  return 'text-danger-400'
}

function driftLabel(drift: number | null): string {
  if (drift === null) return 'Not read'
  const pts = drift // already in percentage points
  const sign = pts > 0 ? '+' : ''
  return `${sign}${formatNumber(pts, { maximumFractionDigits: 1 })} pt`
}

export function HearstAllocationChart({ items }: Readonly<{ items: readonly AllocationItem[] }>) {
  return (
    <div className="px-5 pb-5 sm:px-6">
      <ChartAccessibilityTable
        caption="Target and actual allocation per pocket, in percent"
        columns={['Poche', 'Target', 'Actual']}
        rows={items.map((p) => ({
          key: p.label,
          label: p.label,
          cells: [
            formatChartPercent(p.targetPct),
            p.actualPct === null ? 'Not read' : formatChartPercent(p.actualPct),
          ],
        }))}
      />

      <ul aria-hidden="true" className="flex flex-col gap-4 pt-1">
        {items.map((item) => {
          const drift = driftOf(item)
          const actual = item.actualPct
          return (
            <li key={item.label} className="flex min-w-0 items-center gap-4">
              <span className="w-24 shrink-0 truncate text-xs font-medium text-fg-secondary">
                {item.label}
              </span>

              {/* Track: full-width rail, mint fill = measured exposure, tick = target. */}
              <span
                className="relative h-2.5 min-w-0 flex-1 rounded-full"
                style={{ background: chartTheme.dataSeries.neutralSurface }}
              >
                {actual !== null ? (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, actual))}%`,
                      background: chartTheme.dataSeries.brandPrimary,
                    }}
                  />
                ) : null}
                <span
                  className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    left: `${Math.min(100, Math.max(0, item.targetPct))}%`,
                    background: 'var(--color-fg)',
                  }}
                />
              </span>

              <span className="w-14 shrink-0 text-right text-xs tabular-nums text-fg">
                {actual === null ? '—' : formatChartPercent(actual)}
              </span>
              <span
                className={`w-16 shrink-0 text-right text-xs font-medium tabular-nums ${driftTone(drift)}`}
              >
                {driftLabel(drift)}
              </span>
            </li>
          )
        })}
      </ul>

      <p aria-hidden="true" className="mt-3 flex items-center gap-4 text-[11px] text-fg-tertiary">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: chartTheme.dataSeries.brandPrimary }}
          />
          Exposure
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-0.5 rounded-full" style={{ background: 'var(--color-fg)' }} />
          Target
        </span>
      </p>
    </div>
  )
}
