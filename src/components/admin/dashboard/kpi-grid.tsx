import { isAvailable, type Availability } from '@/lib/vaults/model'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

const ICONS = {
  conversion: ArrowTrendingUpIcon,
  kyc: ClipboardDocumentCheckIcon,
  subscriptions: BanknotesIcon,
  failed: ExclamationTriangleIcon,
} as const

export type DashboardKpi = Readonly<{
  id: keyof typeof ICONS
  title: string
  value: Availability<string>
  unit: string
  /** Variation réelle uniquement — jamais inventée. */
  delta?: string
  /** Sparkline réelle uniquement (≥ 2 points) — non rendu dans le bandeau. */
  sparkline?: number[]
}>

/**
 * KPI dans le bandeau — grille horizontale, cellules verre (pas d’aplats morts).
 */
export function DashboardKpiMetrics({ items }: Readonly<{ items: readonly DashboardKpi[] }>) {
  return (
    <section aria-label="Indicateurs principaux" className="min-w-0">
      <dl className="@container grid grid-cols-1 gap-3 @[28rem]:grid-cols-2 @[52rem]:grid-cols-4">
        {items.map((kpi) => {
          const Icon = ICONS[kpi.id] as ComponentType<SVGProps<SVGSVGElement>>
          const available = isAvailable(kpi.value)
          return (
            <div
              key={kpi.id}
              className={clsx(
                'min-w-0 rounded-xl px-4 py-3',
                'bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md',
              )}
            >
              <dt className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <span className="inline-flex size-6 items-center justify-center rounded-md bg-accent-400/20 text-accent-300">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                {kpi.title}
              </dt>
              <dd className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    'text-2xl/7 font-semibold tracking-tight tabular-nums',
                    available ? 'text-white' : 'text-zinc-500',
                  )}
                >
                  {available ? kpi.value.value : '—'}
                </span>
                <span className="text-xs text-zinc-400">{kpi.unit}</span>
              </dd>
              {kpi.delta !== undefined ? (
                <p className="mt-1 text-xs font-medium text-accent-300">{kpi.delta}</p>
              ) : null}
            </div>
          )
        })}
      </dl>
    </section>
  )
}

/** @deprecated Alias — les KPI vivent dans le bandeau header. */
export const DashboardKpiGrid = DashboardKpiMetrics
