import { DASHBOARD_CHART_SLOT_CLASS } from '@/components/admin/dashboard/shell'
import { surfaceInset } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import { ChartBarIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * Placeholder court — aucune route, aucune documentation.
 */
export function ChartPlaceholder({
  title,
  height = 140,
  dashboardSlot = false,
  icon: Icon = ChartBarIcon,
}: Readonly<{
  title: string
  /** Legacy pixel height when not using the dashboard chart slot token. */
  height?: number
  /** Use the stable dashboard chart viewport token instead of inline height. */
  dashboardSlot?: boolean
  icon?: ComponentType<SVGProps<SVGSVGElement>>
}>) {
  return (
    <output
      data-widget="chart-placeholder"
      className={clsx(
        surfaceInset,
        'flex flex-col items-center justify-center border border-dashed border-console-line px-4 py-5 text-center',
        dashboardSlot && DASHBOARD_CHART_SLOT_CLASS,
      )}
      style={dashboardSlot ? undefined : { minHeight: height }}
      aria-label={title}
    >
      <Icon className="size-8 text-fg dark:text-console-fill" aria-hidden="true" />
      <p className="mt-3 text-sm/6 font-semibold text-ink dark:text-fg">Data unavailable</p>
      <Text className="mt-1">No history available</Text>
    </output>
  )
}
