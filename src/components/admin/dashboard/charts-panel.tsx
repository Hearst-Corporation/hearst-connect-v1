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
        'flex flex-col items-center justify-center border border-dashed border-console-line px-4 py-5 text-center',
      )}
      style={{ minHeight: height }}
      role="status"
      aria-label={title}
    >
      <Icon className="size-8 text-fg dark:text-console-fill" aria-hidden="true" />
      <p className="mt-3 text-sm/6 font-semibold text-ink dark:text-fg">Data unavailable</p>
      <Text className="mt-1">No history available</Text>
    </div>
  )
}
