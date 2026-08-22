import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { isAvailable } from '@/lib/vaults/model'
import type { ReactNode } from 'react'

export type DashboardKpi = AdminHeroKpi

/**
 * Cockpit command bar — the compact header of every admin cockpit page.
 * One title line, the KPI strip beside it, an optional action at the end.
 * A cockpit spends its first pixels on readings, not on hero ceremony
 * (glow, avatar, display type).
 */
export function DashboardHeader({
  title,
  description,
  titleAddon,
  kpis,
  action,
}: Readonly<{
  title?: string
  description?: string
  /** Inline link or control beside the page title (e.g. back to directory). */
  titleAddon?: ReactNode
  kpis: readonly DashboardKpi[]
  action?: ReactNode
}>) {
  return (
    <header
      data-admin="hero-header"
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
    >
      {title !== undefined && title !== '' ? (
        <div className="min-w-0">
          {titleAddon !== undefined ? (
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
              {titleAddon}
            </div>
          ) : (
            <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{title}</h1>
          )}
          {description !== undefined && description !== '' ? (
            <p className="mt-0.5 text-xs text-fg-tertiary">{description}</p>
          ) : null}
        </div>
      ) : null}

      <dl className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-x-8 gap-y-3">
        {kpis.map((kpi) => {
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
                <kpi.icon className="size-3.5 shrink-0 text-accent-300" aria-hidden="true" />
                <span className="truncate">{kpi.title}</span>
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl/7 font-semibold tracking-tight tabular-nums ${available ? 'text-fg' : 'text-fg-tertiary'}`}
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
        {action}
      </dl>
    </header>
  )
}
