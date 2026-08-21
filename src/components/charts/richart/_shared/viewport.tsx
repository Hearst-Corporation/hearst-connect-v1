'use client'

import {
  resolveChartViewport,
  type ChartKind,
  type ChartViewportRole,
} from '@/components/charts/core/chart-theme'
import { useChartWidth } from '@/components/charts/core/use-chart-width'

/**
 * Measured cartesian viewport — ResizeObserver width + role-derived height.
 * Shared by every richart cartesian chart (never `ResponsiveContainer` % in a
 * flex column: the wrapper would collapse to 0×0).
 */
export function useChartViewport(opts: {
  kind: ChartKind
  height?: number
  viewport?: ChartViewportRole
}) {
  const { ref, width } = useChartWidth()
  const viewportHeight = resolveChartViewport({
    height: opts.height,
    viewport: opts.viewport,
    kind: opts.kind,
  })
  return { ref, width, viewportHeight }
}

/** Chronological sort — time series render oldest → newest. */
export function sortByLabelTime<T extends { readonly label: string }>(points: readonly T[]): T[] {
  return [...points].sort((a, b) => +new Date(a.label) - +new Date(b.label))
}

/** Empty state on the same viewport as the populated chart — no layout shift. */
export function ChartViewportEmpty({
  viewportHeight,
  message,
}: Readonly<{ viewportHeight: number; message: string }>) {
  return (
    <div
      className="flex w-full items-center justify-center px-5 text-sm text-fg-tertiary dark:text-fg-secondary"
      style={{ height: viewportHeight }}
      data-chart-viewport={viewportHeight}
    >
      {message}
    </div>
  )
}
