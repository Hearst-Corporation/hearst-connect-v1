'use client'

import { Badge } from '@/components/catalyst/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatDateTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { formatAddress } from '@/lib/format'

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
    <Table dense data-widget="recent-clients">
      <TableHead>
        <TableRow>
          <TableHeader>Client</TableHeader>
          <TableHeader>Date</TableHeader>
          <TableHeader>Exposure</TableHeader>
          <TableHeader>Vault</TableHeader>
          <TableHeader>KYC Som</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {clients.value.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.label}</TableCell>
            <TableCell className="text-fg-tertiary">{formatDateTime(client.createdAt)}</TableCell>
            <TableCell className="tabular-nums">
              {assetScale
                ? formatAdminAtomic(client.currentExposureAtomic, assetScale)
                : '—'}
            </TableCell>
            <TableCell className="font-mono text-xs text-fg-tertiary">
              {client.vaultIds.length > 0 ? formatAddress(client.vaultIds[0] ?? null) ?? '—' : '—'}
            </TableCell>
            <TableCell>
              <Badge color="neutral">{client.kycStatus}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
