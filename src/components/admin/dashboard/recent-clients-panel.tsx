import { HearstSecondaryAction } from '@/components/actions'
import { Badge } from '@/components/catalyst/badge'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'

function ClientsFooter() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
      <HearstSecondaryAction href="/admin/clients">View all clients</HearstSecondaryAction>
    </div>
  )
}

export function RecentClientsPanel({
  clients,
  assetScale,
}: Readonly<{
  clients: Availability<readonly AdminRecentClient[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(clients)) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col justify-center gap-2 py-5">
          <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
          <p className="text-xs text-fg-tertiary">Client directory source unavailable.</p>
        </div>
        <ClientsFooter />
      </div>
    )
  }
  if (clients.value.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col justify-center gap-2 py-5">
          <p className="text-sm font-semibold text-ink dark:text-fg">No recent clients</p>
          <p className="text-xs text-fg-tertiary">No client rows in the recent directory read.</p>
        </div>
        <ClientsFooter />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-widget="recent-clients">
      <AdminTable>
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Client</TableHeader>
            <TableHeader className={tableCol.numeric}>Exposure</TableHeader>
            <TableHeader className={tableCol.status}>KYC</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.value.map((client) => (
            <TableRow key={client.id}>
              <TableCell className={tableCol.primary}>
                <div className="truncate font-medium">{client.label}</div>
                <div className="mt-0.5 text-[11px] text-fg-tertiary">
                  {client.createdAt ? formatRelativeTime(client.createdAt) : '—'}
                </div>
              </TableCell>
              <TableCell className={tableCol.numeric}>
                {assetScale ? formatAdminAtomic(client.currentExposureAtomic, assetScale) : '—'}
              </TableCell>
              <TableCell className={tableCol.status}>
                <Badge color="neutral">{client.kycStatus}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>

      <ClientsFooter />
    </div>
  )
}
