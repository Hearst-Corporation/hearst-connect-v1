import { HearstPrimaryAction } from '@/components/actions'
import {
  DashboardKpiMetrics,
  type DashboardKpi,
} from '@/components/admin/dashboard/kpi-grid'
import { LogoMark } from '@/components/logo'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import { PlusIcon } from '@heroicons/react/16/solid'

/**
 * Header pilotage — hero glow en haut, bande basse noire (H Hearst + KPI).
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const trimmed = userName.trim()
  const rawFirst = trimmed.split(/\s+/)[0] || trimmed
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : rawFirst

  return (
    <header
      data-dashboard="header"
      data-dashboard-kpi-bandeau=""
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
              <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                Bonjour, {firstName}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">
                Voici l’état des opérations de souscription aujourd’hui.
              </p>
            </div>

            <HearstPrimaryAction
              icon={<PlusIcon />}
              disabledReason="Création client non disponible côté backend"
            >
              Ajouter un client
            </HearstPrimaryAction>
          </div>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4 pb-5">
          <DashboardKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
