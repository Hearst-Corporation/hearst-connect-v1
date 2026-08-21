import { AdminHeroKpiMetrics, type AdminHeroKpi } from '@/components/admin/hero-kpi'
import { AdminHeroTitle } from '@/components/admin/typography'
import { LogoMark } from '@/components/logo'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import type { ReactNode } from 'react'

export type { AdminHeroKpi }

/**
 * Shared console header — glow + H monogram + title + optional CTA + horizontal KPIs.
 * Only the title, description, action and KPIs change from one page to another.
 */
export function AdminPageHeader({
  title,
  description,
  action,
  kpis,
  dashboard = false,
}: Readonly<{
  title: string
  description?: string
  action?: ReactNode
  kpis: readonly AdminHeroKpi[]
  /** Contract markers for the `/admin` dashboard. */
  dashboard?: boolean
}>) {
  return (
    <header
      data-admin="hero-header"
      {...(dashboard
        ? { 'data-dashboard': 'header', 'data-dashboard-kpi-bandeau': '' }
        : {})}
      className="-mx-6 -mt-6 overflow-hidden lg:-mx-10 lg:-mt-10 lg:rounded-t-lg"
    >
      <img alt="" src={CONSOLE_GLOW_SRC} className="h-20 w-full object-cover lg:h-28" />

      <div className="bg-black px-6 lg:px-10">
        {/* Identity row — avatar overlaps the glow, title + CTA bottom-aligned */}
        <div className="-mt-8 flex items-end gap-x-4 sm:-mt-10 sm:gap-x-5">
          <span className="relative inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-black ring-4 ring-black outline -outline-offset-1 outline-white/15 sm:size-[4.5rem]">
            <LogoMark className="size-8 text-accent-300 sm:size-9" />
            <span className="sr-only">Hearst</span>
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-3 pb-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <AdminHeroTitle>{title}</AdminHeroTitle>
              {description !== undefined && description !== '' ? (
                <p className="mt-1 max-w-2xl text-sm leading-5 text-fg-secondary sm:truncate">
                  {description}
                </p>
              ) : null}
            </div>

            {action !== undefined ? (
              <div className="shrink-0 self-start sm:self-end">{action}</div>
            ) : null}
          </div>
        </div>

        {kpis.length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-5 pb-6">
            <AdminHeroKpiMetrics items={kpis} />
          </div>
        ) : null}
      </div>
    </header>
  )
}
