'use client'

import { Badge } from '@/components/catalyst/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import type { AdminRecentClient } from '@/lib/admin-dashboard/load'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { formatAddress } from '@/lib/format'

export function RecentClientsPanel({
  clients,
}: Readonly<{ clients: Availability<readonly AdminRecentClient[]> }>) {
  if (!isAvailable(clients)) {
    return <p className="text-sm text-zinc-500">Data unavailable</p>
  }
  if (clients.value.length === 0) {
    return <p className="text-sm text-zinc-500">No recent clients</p>
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
            <TableCell className="text-zinc-500">{formatDateTime(client.createdAt)}</TableCell>
            <TableCell className="tabular-nums">
              {formatCurrency(client.currentExposureAtomic, { fromAtomic: 1_000_000 })}
            </TableCell>
            <TableCell className="font-mono text-xs text-zinc-500">
              {client.vaultIds.length > 0 ? formatAddress(client.vaultIds[0] ?? null) ?? '—' : '—'}
            </TableCell>
            <TableCell>
              <Badge color="zinc">{client.kycStatus}</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
