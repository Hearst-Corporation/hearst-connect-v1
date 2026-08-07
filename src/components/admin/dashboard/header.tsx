import { HearstPrimaryAction } from '@/components/actions'
import {
  DashboardKpiMetrics,
  type DashboardKpi,
} from '@/components/admin/dashboard/kpi-grid'
import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { CONSOLE_GLOW_SRC } from '@/lib/brand'
import { PlusIcon } from '@heroicons/react/16/solid'

/**
 * Header pilotage :
 * 1. Greeting au-dessus + un seul bouton à droite
 * 2. Bandeau glow avec les 4 KPI dedans (pas de logo, pas de search/cloche)
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const firstName = userName.trim().split(/\s+/)[0] || userName

  return (
    <header data-dashboard="header" className="flex flex-col gap-4">
      {/* Au-dessus du bandeau */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading>Bonjour, {firstName}</Heading>
          <Text className="mt-1">
            Voici l’état des opérations de souscription aujourd’hui.
          </Text>
        </div>
        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Création client non disponible côté backend"
        >
          Ajouter un client
        </HearstPrimaryAction>
      </div>

      {/* Bandeau — glow + KPI à l’intérieur */}
      <div
        data-dashboard="kpi-bandeau"
        className="relative overflow-hidden rounded-2xl ring-1 ring-white/10"
      >
        <img
          alt=""
          src={CONSOLE_GLOW_SRC}
          className="absolute inset-0 size-full object-cover"
        />
        {/* Voile léger pour lisibilité, laisse passer le mint */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        />
        <div className="relative z-10 p-5 sm:p-6">
          <DashboardKpiMetrics items={kpis} />
        </div>
      </div>
    </header>
  )
}
