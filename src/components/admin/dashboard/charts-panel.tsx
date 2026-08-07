import { surfaceInset } from '@/components/admin/surface'
import type { HeatmapCell, ProductVolume } from '@/lib/vaults/pilotage'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Text } from '@/components/catalyst/text'
import {
  ChartBarIcon,
  ChartPieIcon,
  CubeTransparentIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * Placeholder court — aucune route, aucune documentation.
 */
export function ChartPlaceholder({
  title,
  height = 280,
  icon: Icon = ChartBarIcon,
}: Readonly<{
  title: string
  height?: number
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}>) {
  return (
    <div
      data-widget="chart-placeholder"
      className={clsx(
        surfaceInset,
        'flex flex-col items-center justify-center border border-dashed border-console-line p-6 text-center',
      )}
      style={{ minHeight: height }}
      role="status"
      aria-label={title}
    >
      <Icon className="size-8 text-zinc-300 dark:text-zinc-600" aria-hidden="true" />
      <p className="mt-3 text-sm/6 font-semibold text-zinc-950 dark:text-white">Données indisponibles</p>
      <Text className="mt-1">Aucun historique disponible</Text>
    </div>
  )
}

export function ActivityHeatmap({
  cells,
}: Readonly<{ cells: Availability<readonly HeatmapCell[]> }>) {
  if (!isAvailable(cells) || cells.value.length === 0) {
    return <ChartPlaceholder title="Activité hebdomadaire" height={180} icon={CubeTransparentIcon} />
  }

  const max = Math.max(...cells.value.map((c) => c.count), 1)

  return (
    <div data-widget="activity-heatmap">
      <div className="grid grid-cols-7 gap-1.5" role="img" aria-label="Activité hebdomadaire">
        {cells.value.map((cell) => {
          const intensity = cell.count / max
          return (
            <div
              key={cell.day}
              title={`${cell.label} : ${cell.count}`}
              className={clsx(
                'flex aspect-square flex-col items-center justify-center rounded-md text-[9px] font-medium',
                intensity > 0.66
                  ? 'bg-accent-400 text-accent-ink'
                  : intensity > 0.33
                    ? 'bg-accent-300 text-accent-ink'
                    : 'bg-accent-400/20 text-accent-800 dark:text-accent-300',
              )}
            >
              <span className="tabular-nums">{cell.count}</span>
            </div>
          )
        })}
      </div>
      <ul className="sr-only">
        {cells.value.map((cell) => (
          <li key={cell.day}>
            {cell.label} : {cell.count} action(s)
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProductBars({
  products,
}: Readonly<{ products: Availability<readonly ProductVolume[]> }>) {
  if (!isAvailable(products) || products.value.length === 0) {
    return <ChartPlaceholder title="Souscriptions par produit" height={180} icon={ChartPieIcon} />
  }

  const max = Math.max(...products.value.map((p) => p.count), 1)
  const rows = products.value.slice(0, 6)

  return (
    <ul data-widget="product-bars" className="space-y-3">
      {rows.map((p) => {
        const width = Math.max(6, Math.round((p.count / max) * 100))
        const amount = p.amountAtomic
        return (
          <li key={p.product}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <Text className="truncate !text-xs">{p.product.length > 28 ? `${p.product.slice(0, 26)}…` : p.product}</Text>
              <span className="shrink-0 text-xs/5 font-semibold tabular-nums text-zinc-950 dark:text-white">
                {amount !== null ? amount : p.count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
              <div className="h-full rounded-full bg-accent-400" style={{ width: `${width}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
