import { AdminLabel } from '@/components/admin/typography'
import { RequirementList, surfaceInset } from '@/components/admin/surface'
import { AdminToneBadge } from '@/components/admin/status-tone'
import { Text } from '@/components/catalyst/text'
import {
  type ChartViewportRole,
  resolveChartViewport,
} from '@/components/charts/core/chart-theme'
import { Panel, PanelHeader } from '@/components/compositions/panel'
import { ChartBarIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * Common frame for every chart in the product.
 *
 * A chart is not an image — it's a claim about data. This frame requires,
 * for every chart, what makes the claim verifiable: the question asked in
 * the title, the unit, the provenance, and the state of the data at render
 * time.
 *
 * Viewport ownership: empty / pending / unavailable use the same role-based
 * viewport as the plotted chart would (`viewport` prop → `chartViewport`).
 * Dataset length never chooses the slot height.
 */

export type SeriesState =
  | { readonly type: 'plotted' }
  | { readonly type: 'empty'; readonly explanation: string }
  | { readonly type: 'pending'; readonly explanation: string }
  | { readonly type: 'unavailable'; readonly explanation: string }

const STATE_LABEL: Record<Exclude<SeriesState['type'], 'plotted'>, string> = {
  empty: 'No data for this period',
  pending: 'Waiting on source',
  unavailable: 'Data unavailable',
}

const STATE_ICON: Record<Exclude<SeriesState['type'], 'plotted'>, ComponentType<SVGProps<SVGSVGElement>>> = {
  empty: ChartBarIcon,
  pending: ClockIcon,
  unavailable: ExclamationTriangleIcon,
}

function StateVisual({
  state,
  expectedSource,
  onRetry,
  retryLabel,
  viewportPx,
}: Readonly<{
  state: Exclude<SeriesState, { type: 'plotted' }>
  expectedSource?: readonly string[]
  onRetry?: () => void
  retryLabel: string
  viewportPx: number
}>) {
  const Icon = STATE_ICON[state.type]
  const danger = state.type === 'unavailable'
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-center"
      style={{ height: viewportPx, minHeight: viewportPx }}
      data-chart-viewport={viewportPx}
    >
      <span
        className={clsx(
          'flex size-14 items-center justify-center rounded-2xl ring-1',
          danger
            ? 'bg-danger-400/10 text-danger-500 ring-danger-400/20 dark:text-danger-400'
            : clsx(surfaceInset, 'text-fg-tertiary'),
        )}
      >
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <AdminToneBadge tone={danger ? 'bad' : 'neutral'}>{STATE_LABEL[state.type]}</AdminToneBadge>
      <Text className="max-w-sm text-sm leading-relaxed text-fg-secondary">{state.explanation}</Text>
      {expectedSource?.length ? (
        <div className="w-full max-w-xs text-left">
          <AdminLabel>Expected source</AdminLabel>
          <RequirementList requis={expectedSource as string[]} />
        </div>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium text-accent-400 underline underline-offset-4 hover:text-accent-300"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  )
}

function ChartFrameContent({
  state,
  children,
  expectedSource,
  onRetry,
  retryLabel,
  viewportPx,
}: Readonly<{
  state: SeriesState
  children?: React.ReactNode
  expectedSource?: readonly string[]
  onRetry?: () => void
  retryLabel: string
  viewportPx: number
}>) {
  if (state.type === 'plotted') {
    return children
  }
  if (children != null) {
    return (
      <>
        {children}
        <div className="flex items-start gap-2 px-5 pb-5 sm:px-6">
          <AdminToneBadge tone={state.type === 'unavailable' ? 'bad' : 'neutral'}>
            {STATE_LABEL[state.type]}
          </AdminToneBadge>
          <Text className="max-w-prose text-xs leading-relaxed text-fg-secondary">
            {state.explanation}
          </Text>
        </div>
      </>
    )
  }
  return (
    <StateVisual
      state={state}
      expectedSource={expectedSource}
      onRetry={onRetry}
      retryLabel={retryLabel}
      viewportPx={viewportPx}
    />
  )
}

export function ChartFrame({
  question,
  unit,
  state,
  viewport = 'standard',
  /** @deprecated Prefer `viewport` role. Escape hatch for an explicit px height. */
  hauteur,
  expectedSource,
  onRetry,
  retryLabel = 'Retry',
  children,
}: Readonly<{
  question: string
  unit: string
  state: SeriesState
  /** Role-based viewport shared by empty / pending / unavailable (and callers for plotted). */
  viewport?: ChartViewportRole
  /**
   * @deprecated Prefer `viewport`. Explicit px for the empty-state slot when
   * a role is not enough. Defaults to the resolved role viewport.
   */
  hauteur?: number
  expectedSource?: readonly string[]
  onRetry?: () => void
  retryLabel?: string
  children?: React.ReactNode
}>) {
  const viewportPx = resolveChartViewport({
    height: hauteur,
    viewport,
  })

  return (
    <Panel tone="chart" className="flex h-full flex-col">
      <PanelHeader title={question} hint={unit} />

      <ChartFrameContent
        state={state}
        expectedSource={expectedSource}
        onRetry={onRetry}
        retryLabel={retryLabel}
        viewportPx={viewportPx}
      >
        {children}
      </ChartFrameContent>
    </Panel>
  )
}
