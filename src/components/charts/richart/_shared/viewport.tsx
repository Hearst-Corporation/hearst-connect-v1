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
  const time = (label: string) => {
    const parsed = +new Date(label)
    // `MM-DD` — le format des axes de cette application — n'est pas une date
    // valide pour `Date`, qui renvoie `NaN`. Un comparateur qui renvoie `NaN`
    // laisse l'ordre indéfini : la série se réordonnait au hasard des moteurs.
    // On complète alors l'année en cours, ce qui rétablit un ordre stable.
    if (Number.isFinite(parsed)) return parsed
    const md = /^(\d{2})-(\d{2})$/.exec(label)
    if (md === null) return Number.NaN
    return +new Date(`${new Date().getFullYear()}-${md[1]}-${md[2]}T00:00:00Z`)
  }

  return [...points].sort((a, b) => {
    const ta = time(a.label)
    const tb = time(b.label)
    // Deux libellés illisibles : on garde l'ordre reçu plutôt que d'en inventer un.
    if (!Number.isFinite(ta) || !Number.isFinite(tb)) return 0
    return ta - tb
  })
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
