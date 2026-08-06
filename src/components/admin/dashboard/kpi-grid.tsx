import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { RichSparkline } from '@/components/charts'
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
  /** Sparkline réelle uniquement (≥ 2 points). */
  sparkline?: number[]
}>

/**
 * Quatre cartes KPI — typo Catalyst, icônes Heroicons 16, accent mint Hearst.
 */
export function DashboardKpiGrid({ items }: Readonly<{ items: readonly DashboardKpi[] }>) {
  return (
    <section
      aria-label="Indicateurs principaux"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {items.map((kpi) => {
        const Icon = ICONS[kpi.id] as ComponentType<SVGProps<SVGSVGElement>>
        const available = isAvailable(kpi.value)
        const spark =
          kpi.sparkline !== undefined && kpi.sparkline.length >= 2 ? kpi.sparkline : undefined
        return (
          <article
            key={kpi.id}
            className="rounded-xl bg-white p-5 shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-400/15 text-accent-700 dark:text-accent-400">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <Subheading level={2} className="!text-sm/6">
                {kpi.title}
              </Subheading>
            </div>

            {available ? (
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl/8 font-semibold tracking-tight tabular-nums text-zinc-950 dark:text-white">
                  {kpi.value.value}
                </span>
                <Text className="!text-xs">{kpi.unit}</Text>
              </div>
            ) : (
              <div className="mt-3">
                <span className="text-3xl/8 font-semibold text-zinc-300 dark:text-zinc-600">—</span>
                <Text className="mt-1 !text-xs">Indisponible</Text>
              </div>
            )}

            {kpi.delta !== undefined ? (
              <p className="mt-1 text-xs/5 font-medium text-accent-700 dark:text-accent-400">
                {kpi.delta}
              </p>
            ) : null}

            {spark !== undefined ? (
              <div className="mt-2 h-8">
                <RichSparkline data={spark} color="var(--color-accent-400)" />
              </div>
            ) : null}
          </article>
        )
      })}
    </section>
  )
}
