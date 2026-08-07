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
      <img alt="" src={CONSOLE_GLOW_SRC} className="h-20 w-full object-cover lg:h-28" />

      <div className="bg-black px-6 lg:px-10">
        {/* Rangée identité — avatar chevauche le glow, titre + CTA alignés en bas */}
        <div className="-mt-8 flex items-end gap-x-4 sm:-mt-10 sm:gap-x-5">
          <span className="relative inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-black ring-4 ring-black outline -outline-offset-1 outline-white/15 sm:size-[4.5rem]">
            <LogoMark className="size-8 text-accent-300 sm:size-9" />
            <span className="sr-only">Hearst</span>
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-3 pb-0.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {title}
              </h1>
              {description !== undefined && description !== '' ? (
                <p className="mt-1 max-w-2xl text-sm leading-5 text-zinc-400 sm:truncate">
                  {description}
                </p>
              ) : null}
            </div>

            {action !== undefined ? (
              <div className="shrink-0 self-start sm:self-end">{action}</div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5 pb-6">
          <AdminHeroKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
