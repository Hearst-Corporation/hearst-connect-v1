import { adminTypography } from '@/components/admin/typography'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * Text KPI for the admin hero banner — no box, no background, no ring.
 */
export type AdminHeroKpi = Readonly<{
  id: string
  title: string
  value: Availability<string>
  /** Short unit / precision to the right of the value (optional). */
  unit?: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}>

/**
 * The FIRST kpi is the page's dominant fact — rendered display-large
 * (`numericHero`), full-width above the rest. The remaining kpis stay
 * secondary in a horizontal band. This is the page's typographic hierarchy:
 * one fact reads first, the others support it. A single kpi renders as the
 * hero alone.
 */
function HeroPrimary({ kpi }: Readonly<{ kpi: AdminHeroKpi }>) {
  const Icon = kpi.icon
  const available = isAvailable(kpi.value)
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
        <Icon className="size-3.5 shrink-0 text-accent-300" aria-hidden="true" />
        <span className="truncate">{kpi.title}</span>
      </dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className={clsx(adminTypography.numericHero, !available && 'text-fg-tertiary')}>
          {available ? kpi.value.value : '—'}
        </span>
        {kpi.unit !== undefined && kpi.unit !== '' ? (
          <span className="truncate text-xs text-fg-tertiary">{kpi.unit}</span>
        ) : null}
      </dd>
    </div>
  )
}

function HeroSecondary({ kpi }: Readonly<{ kpi: AdminHeroKpi }>) {
  const Icon = kpi.icon
  const available = isAvailable(kpi.value)
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
        <Icon className="size-3 shrink-0 text-accent-300" aria-hidden="true" />
        <span className="truncate">{kpi.title}</span>
      </dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span
          className={clsx(
            'text-lg/6 font-semibold tracking-tight tabular-nums',
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
}

export function AdminHeroKpiMetrics({ items }: Readonly<{ items: readonly AdminHeroKpi[] }>) {
  if (items.length === 0) return null

  const [primary, ...secondary] = items

  return (
    <section aria-label="Key metrics" className="@container min-w-0">
      <dl className="flex flex-col gap-x-8 gap-y-5 @[36rem]:flex-row @[36rem]:items-end">
        <HeroPrimary kpi={primary} />
        {secondary.length > 0 ? (
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 @[36rem]:grid-cols-3 @[36rem]:pb-1">
            {secondary.map((kpi) => (
              <HeroSecondary key={kpi.id} kpi={kpi} />
            ))}
          </div>
        ) : null}
      </dl>
    </section>
  )
}
