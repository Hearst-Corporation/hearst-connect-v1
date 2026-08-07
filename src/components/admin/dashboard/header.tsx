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
 * Header pilotage — UNE seule box full-bleed.
 * Greeting + bouton + KPI en texte (aucune sous-box).
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const firstName = userName.trim().split(/\s+/)[0] || userName

  return (
    <header
      data-dashboard="header"
      data-dashboard-kpi-bandeau=""
      className="-mx-6 -mt-6 lg:-mx-10 lg:-mt-10"
    >
      <div className="relative overflow-hidden">
        <img
          alt=""
          src={CONSOLE_GLOW_SRC}
          className="absolute inset-0 size-full object-cover"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/35" />

        <div className="relative z-10 px-6 py-6 lg:px-10 lg:py-8">
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

          <div className="mt-8">
            <DashboardKpiMetrics items={kpis} />
          </div>
        </div>
      </div>
    </header>
  )
}
