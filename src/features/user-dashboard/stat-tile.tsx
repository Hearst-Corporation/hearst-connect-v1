'use client'

import { ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '@heroicons/react/16/solid'
import type { ComponentType, SVGProps } from 'react'
import { RichSparkline } from '@/components/charts'
import { formatPercent } from '@/lib/format'
import type { Signal } from '@/lib/vaults/model'

/**
 * Premium KPI tile — Heroicon eyebrow, label, big value, a freshness dot, an
 * optional 12-point sparkline trend and a MEASURED signed delta.
 *
 * Honest by construction: `value` is already resolved to a string ("—" when the
 * source is absent — never a fabricated 0). `delta` is passed only when a real
 * series of ≥2 points supports it (see `deltaOf`); null renders nothing. The big
 * value uses proportional figures (no tabular-nums at display size).
 */

export function deltaOf(points: readonly { readonly value: number }[] | null): number | null {
  if (points === null || points.length < 2) return null
  const first = points[0].value
  const last = points[points.length - 1].value
  if (first === 0 || !Number.isFinite(first)) return null
  return (last - first) / first
}

export function StatTile({
  icon: Icon,
  label,
  value,
  signal,
  trend,
  delta,
}: Readonly<{
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  signal: Signal
  trend?: readonly number[]
  delta?: number | null
}>) {
  const hasDelta = delta !== null && delta !== undefined && Number.isFinite(delta)
  const up = hasDelta && (delta as number) >= 0
  const DeltaIcon = up ? ArrowTrendingUpIcon : ArrowTrendingDownIcon

  return (
    <div className="stat-tile">
      <div className="stat-eyebrow">
        <Icon className="size-4" aria-hidden="true" />
        <span>{label}</span>
        <i className="stat-signal" data-signal={signal} aria-hidden="true" />
      </div>
      <div className="stat-value-row">
        <strong className="stat-value mono">{value}</strong>
        {hasDelta ? (
          <span className={`stat-delta mono${up ? ' is-up' : ' is-down'}`}>
            <DeltaIcon className="size-3" aria-hidden="true" />
            {formatPercent((delta as number) * 100, { maximumFractionDigits: 1, signed: true })}
          </span>
        ) : null}
      </div>
      {trend !== undefined && trend.length >= 2 ? (
        <div className="stat-spark">
          <RichSparkline data={[...trend]} />
        </div>
      ) : null}
    </div>
  )
}
