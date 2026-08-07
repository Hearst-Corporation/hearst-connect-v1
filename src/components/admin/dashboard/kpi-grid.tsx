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
 * KPI en texte dans le bandeau — aucune box, aucun fond, aucun ring.
 * Rangée horizontale (2 cols mobile → 4 cols dès sm).
 */
export function DashboardKpiMetrics({ items }: Readonly<{ items: readonly DashboardKpi[] }>) {
  return (
    <section aria-label="Indicateurs principaux" className="min-w-0">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 sm:gap-x-8">
        {items.map((kpi) => {
          const Icon = ICONS[kpi.id] as ComponentType<SVGProps<SVGSVGElement>>
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <Icon className="size-3 shrink-0 text-accent-300" aria-hidden="true" />
                <span className="truncate">{kpi.title}</span>
              </dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    'text-xl/6 font-semibold tracking-tight tabular-nums',
                    available ? 'text-white' : 'text-zinc-500',
                  )}
                >
                  {available ? kpi.value.value : '—'}
                </span>
                <span className="truncate text-[11px] text-zinc-500">{kpi.unit}</span>
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

/** @deprecated Alias — KPI = texte dans le bandeau. */
export const DashboardKpiGrid = DashboardKpiMetrics
