import { HearstPrimaryAction } from '@/components/actions'
import {
  DashboardKpiMetrics,
  type DashboardKpi,
} from '@/components/admin/dashboard/kpi-grid'
import { Avatar } from '@/components/catalyst/avatar'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import { PlusIcon } from '@heroicons/react/16/solid'

/**
 * Header pilotage — structure Profile Header (Tailwind UI) :
 * bandeau full-bleed → avatar chevauchant → nom + CTA à droite → KPI horizontaux bruts.
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const trimmed = userName.trim()
  const rawFirst = trimmed.split(/\s+/)[0] || trimmed
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : rawFirst
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <header
      data-dashboard="header"
      data-dashboard-kpi-bandeau=""
      className="-mx-6 -mt-6 overflow-hidden lg:-mx-10 lg:-mt-10 lg:rounded-t-lg"
    >
      <img alt="" src={CONSOLE_GLOW_SRC} className="h-32 w-full object-cover lg:h-48" />

      <div className="px-6 lg:px-10">
        <div className="-mt-12 sm:-mt-16 sm:flex sm:items-end sm:space-x-5">
          <div className="flex">
            <Avatar
              initials={initials || 'HC'}
              alt=""
              className="size-24 bg-zinc-800 text-white ring-4 ring-zinc-950 outline -outline-offset-1 outline-white/10 sm:size-32"
            />
          </div>

          <div className="mt-6 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="mt-6 min-w-0 flex-1 sm:hidden md:block">
              <h1 className="truncate text-2xl font-bold text-white">Bonjour, {firstName}</h1>
            </div>

            <div className="mt-6 flex flex-col justify-stretch space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4">
              <HearstPrimaryAction
                icon={<PlusIcon />}
                disabledReason="Création client non disponible côté backend"
              >
                Ajouter un client
              </HearstPrimaryAction>
            </div>
          </div>
        </div>

        <div className="mt-6 hidden min-w-0 flex-1 sm:block md:hidden">
          <h1 className="truncate text-2xl font-bold text-white">Bonjour, {firstName}</h1>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 pb-6 lg:pb-8">
          <p className="mb-5 text-sm text-zinc-300">
            Voici l’état des opérations de souscription aujourd’hui.
          </p>
          <DashboardKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
