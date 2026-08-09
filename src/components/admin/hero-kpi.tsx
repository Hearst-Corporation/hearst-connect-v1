import { AdminMetricGrid } from '@/components/admin/grid'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * KPI texte pour le bandeau hero admin — aucune box, aucun fond, aucun ring.
 */
export type AdminHeroKpi = Readonly<{
  id: string
  title: string
  value: Availability<string>
  /** Unité / précision courte à droite de la valeur (optionnel). */
  unit?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}>

export function AdminHeroKpiMetrics({ items }: Readonly<{ items: readonly AdminHeroKpi[] }>) {
  return (
    <section aria-label="Key metrics" className="@container min-w-0">
      <AdminMetricGrid count={items.length} as="dl">
        {items.map((kpi) => {
          const Icon = kpi.icon
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
                <Icon className="size-3 shrink-0 text-accent-300" aria-hidden="true" />
                <span className="truncate">{kpi.title}</span>
              </dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={clsx(
                    'text-xl/6 font-semibold tracking-tight tabular-nums',
                    available ? 'text-fg' : 'text-fg-tertiary',
                  )}
                >
                  {available ? kpi.value.value : '—'}
                </span>
                {kpi.unit !== undefined && kpi.unit !== '' ? (
                  <span className="truncate text-[11px] text-fg-tertiary">{kpi.unit}</span>
                ) : null}
              </dd>
            </div>
          )
        })}
      </AdminMetricGrid>
    </section>
  )
}
