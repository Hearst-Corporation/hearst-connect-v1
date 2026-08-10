import { HearstPrimaryAction } from '@/components/actions'
import { AdminPageHeader } from '@/components/admin/page-header'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { PlusIcon } from '@heroicons/react/16/solid'

export type DashboardKpi = AdminHeroKpi

/**
 * `/admin` control header — same pattern as the other admin pages.
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
      title={`Good morning, ${firstName}`}
      description="Portfolio, market exposure and operations at a glance."
      action={
        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Client creation is not available on the backend"
        >
          Add client
        </HearstPrimaryAction>
      }
      kpis={kpis}
    />
  )
}
