import { AdminHeroKpiMetrics, type AdminHeroKpi } from '@/components/admin/hero-kpi'
import { LogoMark } from '@/components/logo'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import type { ReactNode } from 'react'

export type { AdminHeroKpi }

/**
 * Header console partagé — glow + monogramme H + titre + CTA optionnel + KPI horizontaux.
 * Seuls le titre, la description, l’action et les KPI changent d’une page à l’autre.
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
  /** Marqueurs de contrat du tableau de bord `/admin`. */
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
      <img alt="" src={CONSOLE_GLOW_SRC} className="h-16 w-full object-cover lg:h-20" />

      <div className="bg-black px-6 lg:px-10">
        <div className="-mt-7 flex flex-wrap items-end gap-x-4 gap-y-3 sm:-mt-8">
          <span className="inline-flex size-14 items-center justify-center rounded-full bg-black ring-2 ring-white/10 sm:size-16">
            <LogoMark className="size-7 text-accent-300 sm:size-8" />
            <span className="sr-only">Hearst</span>
          </span>

          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pb-0.5">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">{title}</h1>
              {description !== undefined && description !== '' ? (
                <p className="mt-0.5 text-sm text-zinc-400">{description}</p>
              ) : null}
            </div>

            {action !== undefined ? <div className="shrink-0">{action}</div> : null}
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 pb-5">
          <AdminHeroKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
