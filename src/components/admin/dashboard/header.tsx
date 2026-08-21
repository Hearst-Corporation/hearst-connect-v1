import { HearstPrimaryAction } from '@/components/actions'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { isAvailable } from '@/lib/vaults/model'
import { PlusIcon } from '@heroicons/react/16/solid'

export type DashboardKpi = AdminHeroKpi

/**
 * Cockpit command bar — no hero ceremony (glow, avatar, display type).
 * A cockpit spends its first pixels on readings, not on branding: the
 * greeting is one line, the four KPIs read as a compact strip beside it.
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
      data-admin="hero-header"
      data-dashboard="header"
      data-dashboard-kpi-bandeau=""
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
    >
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-fg">
          Good morning, {firstName}
        </h1>
        <p className="mt-0.5 text-xs text-fg-tertiary">
          Portfolio, market exposure and operations at a glance.
        </p>
      </div>

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
        <HearstPrimaryAction
          icon={<PlusIcon />}
          disabledReason="Client creation is not available on the backend"
        >
          Add client
        </HearstPrimaryAction>
      </dl>
    </header>
  )
}
