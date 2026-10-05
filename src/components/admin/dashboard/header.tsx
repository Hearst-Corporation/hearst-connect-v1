import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { activeBodyHref, bodySubmenus } from '@/lib/admin-nav'
import { isAvailable } from '@/lib/vaults/model'
import { KpiBand } from '@hearst/ui/kpi'
import { FilterBar, PageHeader, PageTabs } from '@hearst/ui/page'
import type { ReactNode } from 'react'

export type DashboardKpi = AdminHeroKpi

function kpiLine(kpi: DashboardKpi): string {
  if (!isAvailable(kpi.value)) return kpi.value.status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'
  // A non-breaking space keeps every column of the band one line tall.
  return kpi.unit !== undefined && kpi.unit !== '' ? kpi.unit : ' '
}

/**
 * The head of every admin page: the title with its section's pages as tabs
 * (`path` is the page's route), the KPI band under it, then the actions row.
 */
export function DashboardHeader({
  title,
  path,
  back,
  kpis,
  action,
}: Readonly<{
  title: string
  path?: string
  back?: { href: string; label: string }
  kpis: readonly DashboardKpi[]
  action?: ReactNode
}>) {
  const submenus = path === undefined ? undefined : bodySubmenus(path)
  const current = path === undefined ? undefined : activeBodyHref(path)

  return (
    <>
      <PageHeader title={title} back={back}>
        {submenus !== undefined ? (
          <PageTabs
            label="Section"
            tabs={submenus.map((entry) => ({
              label: entry.label,
              href: entry.href,
              current: entry.href === current,
              title: entry.detail,
            }))}
          />
        ) : null}
      </PageHeader>
      {kpis.length > 0 ? (
        <KpiBand
          label={`${title} figures`}
          items={kpis.map((kpi) => ({
            label: kpi.title,
            value: isAvailable(kpi.value) ? kpi.value.value : '—',
            line: kpiLine(kpi),
          }))}
        />
      ) : null}
      {action !== undefined ? <FilterBar actions={action} /> : null}
    </>
  )
}
