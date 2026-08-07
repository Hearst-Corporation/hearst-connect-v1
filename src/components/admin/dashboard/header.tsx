import { HearstPrimaryAction } from '@/components/actions'
import { AdminPageHeader } from '@/components/admin/page-header'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { PlusIcon } from '@heroicons/react/16/solid'

export type DashboardKpi = AdminHeroKpi

/**
 * Header pilotage `/admin` — même pattern que les autres pages admin.
 */
export function DashboardHeader({
  userName,
  kpis,
}: Readonly<{ userName: string; kpis: readonly DashboardKpi[] }>) {
  const trimmed = userName.trim()
  const rawFirst = trimmed.split(/\s+/)[0] || trimmed
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : rawFirst

  return (
    <AdminPageHeader
      dashboard
      title={`Bonjour, ${firstName}`}
      description="Voici l’état des opérations de souscription aujourd’hui."
      action={
        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Création client non disponible côté backend"
        >
          Ajouter un client
        </HearstPrimaryAction>
      }
      kpis={kpis}
    />
  )
}
