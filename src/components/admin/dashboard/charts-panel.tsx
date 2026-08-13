import { Text } from '@/components/catalyst/text'
import {
  type ChartViewportRole,
  resolveChartViewport,
} from '@/components/charts/core/chart-theme'

/**
 * Frameless chart-slot placeholder — same viewport as the populated chart.
 * Lives inside DashCard; no second surface.
 */
export function ChartPlaceholder({
  title,
  detail,
  viewport = 'compact',
  height,
}: Readonly<{
  title: string
  detail?: string | null
  viewport?: ChartViewportRole
  /** @deprecated Prefer `viewport`. Escape hatch for explicit px. */
  height?: number
}>) {
  const viewportPx = resolveChartViewport({ height, viewport })
  return (
    <output
      data-widget="chart-placeholder"
      data-chart-viewport={viewportPx}
      className="flex h-full flex-col justify-center gap-1 py-5"
      style={{ height: viewportPx, minHeight: viewportPx }}
      aria-label={title}
    >
      <p className="text-sm font-semibold text-ink dark:text-fg">{title}</p>
      {detail ? (
        <p className="text-xs text-fg-tertiary">{detail}</p>
      ) : (
        <Text className="mt-0">No history available</Text>
      )}
    </output>
  )
}
