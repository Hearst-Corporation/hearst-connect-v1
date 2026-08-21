import { PanelFooterLink, PanelState } from '@/components/admin/dashboard/panel-state'
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

function ClientsState({ title, detail }: Readonly<{ title: string; detail: string }>) {
  return (
    <div className="space-y-4">
      <PanelState title={title} detail={detail} />
      <PanelFooterLink href="/admin/clients" label="View all clients" />
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
    return <ClientsState title="Data unavailable" detail="Client directory source unavailable." />
  }
  if (clients.value.length === 0) {
    return <ClientsState title="No recent clients" detail="No client rows in the recent directory read." />
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

      <PanelFooterLink href="/admin/clients" label="View all clients" />
    </div>
  )
}
