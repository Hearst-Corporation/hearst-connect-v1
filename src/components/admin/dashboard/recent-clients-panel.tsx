import { Badge } from '@/components/catalyst/badge'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { FitTable } from '@/components/compositions'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'

export function RecentClientsPanel({
  clients,
  assetScale,
}: Readonly<{
  clients: Availability<readonly AdminRecentClient[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(clients)) {
    return <p className="text-sm text-fg-tertiary">Data unavailable</p>
  }
  if (clients.value.length === 0) {
    return <p className="text-sm text-fg-tertiary">No recent clients</p>
  }

  return (
    <div data-widget="recent-clients">
      <FitTable>
        <TableHead>
          <TableRow>
            <TableHeader className="w-[40%]">Client</TableHeader>
            <TableHeader className="w-[30%]">Exposure</TableHeader>
            <TableHeader className="w-[30%]">KYC</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {clients.value.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div className="truncate font-medium">{client.label}</div>
                <div className="mt-0.5 text-[11px] text-fg-tertiary">
                  {client.createdAt ? formatRelativeTime(client.createdAt) : '—'}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">
                {assetScale ? formatAdminAtomic(client.currentExposureAtomic, assetScale) : '—'}
              </TableCell>
              <TableCell>
                <Badge color="neutral">{client.kycStatus}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </FitTable>
    </div>
  )
}
