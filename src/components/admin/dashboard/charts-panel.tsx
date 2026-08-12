import { surfaceInset } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import {
  chartViewport,
  type ChartViewportRole,
  resolveChartViewport,
} from '@/components/charts/core/chart-theme'
import { ChartBarIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * Chart-slot placeholder — same viewport contract as the populated chart.
 * Default role: compact (admin bento). No independent legacy height.
 */
export function ChartPlaceholder({
  title,
  viewport = 'compact',
  height,
  icon: Icon = ChartBarIcon,
}: Readonly<{
  title: string
  viewport?: ChartViewportRole
  /** @deprecated Prefer `viewport`. Escape hatch for explicit px. */
  height?: number
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}>) {
  const viewportPx = resolveChartViewport({ height, viewport })
  return (
    <output
      data-widget="chart-placeholder"
      data-chart-viewport={viewportPx}
      className={clsx(
        surfaceInset,
        'flex flex-col items-center justify-center border border-dashed border-console-line px-4 py-5 text-center',
      )}
      style={{ height: viewportPx, minHeight: viewportPx }}
      aria-label={title}
    >
      <Icon className="size-8 text-fg dark:text-console-fill" aria-hidden="true" />
      <p className="mt-3 text-sm/6 font-semibold text-ink dark:text-fg">Data unavailable</p>
      <Text className="mt-1">No history available</Text>
    </output>
  )
}

export function chartPlaceholderDefaultViewportPx(): number {
  return chartViewport('compact')
}
