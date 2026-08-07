import { Text } from '@/components/catalyst/text'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/16/solid'
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
  /** Sparkline réelle uniquement (≥ 2 points) — réservé, non rendu dans le header compact. */
  sparkline?: number[]
}>

/**
 * KPI intégrés au header (pas de boxes isolées).
 * Grille type « profile fields » — titre + valeur + unité.
 */
export function DashboardKpiMetrics({ items }: Readonly<{ items: readonly DashboardKpi[] }>) {
  return (
    <section aria-label="Indicateurs principaux" className="min-w-0">
      <dl className="@container grid grid-cols-1 gap-4 @[28rem]:grid-cols-2 @[56rem]:grid-cols-4">
        {items.map((kpi) => {
          const Icon = ICONS[kpi.id] as ComponentType<SVGProps<SVGSVGElement>>
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="inline-flex size-7 items-center justify-center rounded-md bg-accent-400/15 text-accent-400">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                {kpi.title}
              </dt>
              <dd className="mt-2 flex items-baseline gap-1.5">
                {available ? (
                  <>
                    <span className="text-2xl/7 font-semibold tracking-tight tabular-nums text-white">
                      {kpi.value.value}
                    </span>
                    <Text className="!text-xs">{kpi.unit}</Text>
                  </>
                ) : (
                  <>
                    <span className="text-2xl/7 font-semibold text-zinc-500">—</span>
                    <Text className="!text-xs">{kpi.unit}</Text>
                  </>
                )}
              </dd>
              {kpi.delta !== undefined ? (
                <p className="mt-1 text-xs font-medium text-accent-400">{kpi.delta}</p>
              ) : null}
            </div>
          )
        })}
      </dl>
    </section>
  )
}

/** @deprecated Alias — les KPI vivent dans le header, plus de grille de boxes. */
export const DashboardKpiGrid = DashboardKpiMetrics
