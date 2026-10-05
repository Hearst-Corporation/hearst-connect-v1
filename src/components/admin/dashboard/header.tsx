import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { activeBodyHref, bodySubmenus } from '@/lib/admin-nav'
import { isAvailable } from '@/lib/vaults/model'
import { KpiBand } from '@hearst/ui/kpi'
import { PageHeader, PageTabs } from '@hearst/ui/page'
import type { ReactNode } from 'react'

export type DashboardKpi = AdminHeroKpi

function kpiLine(kpi: DashboardKpi): string {
  if (!isAvailable(kpi.value)) return kpi.value.status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'
  // A non-breaking space keeps every column of the band one line tall.
  return kpi.unit !== undefined && kpi.unit !== '' ? kpi.unit : ' '
}

/**
 * The head of every admin page: the title with its section's pages as tabs
 * (`path` is the page's route) and its actions, the KPI band under it.
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
  /** `label` is what the back button says to a screen reader ("Back to …"). */
  back?: { href: string; label: string }
  kpis: readonly DashboardKpi[]
  action?: ReactNode
}>) {
  const submenus = path === undefined ? undefined : bodySubmenus(path)
  const current = path === undefined ? undefined : activeBodyHref(path)

  return (
    <>
      <PageHeader title={title} back={back} actions={action}>
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
    </>
  )
}
