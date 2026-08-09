import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import { Badge } from '@/components/catalyst/badge'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { FitTable, fitTableColCompact, fitTableColPrimary } from '@/components/compositions'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatRelativeTime, pluralSuffix } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

const MAX_VISIBLE_CLIENTS = 3
const CLIENTS_SLOT_CLASS = 'min-h-[var(--dashboard-list-slot-block-size)]'

export function RecentClientsPanel({
  clients,
  assetScale,
}: Readonly<{
  clients: Availability<readonly AdminRecentClient[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(clients)) {
    return (
      <div className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
        <div className={clsx(surfaceInset, CLIENTS_SLOT_CLASS, 'flex flex-col justify-center gap-2 px-4 py-5')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
          <p className="text-xs text-fg-tertiary">Client directory source unavailable.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/clients">View all clients</HearstSecondaryAction>
        </div>
      </div>
    )
  }
  if (clients.value.length === 0) {
    return (
      <div className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
        <div className={clsx(surfaceInset, CLIENTS_SLOT_CLASS, 'flex flex-col justify-center gap-2 px-4 py-5')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">No recent clients</p>
          <p className="text-xs text-fg-tertiary">The dashboard keeps the same client summary slot when no new client appears.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/clients">View all clients</HearstSecondaryAction>
        </div>
      </div>
    )
  }

  const visibleClients = clients.value.slice(0, MAX_VISIBLE_CLIENTS)
  const hiddenClients = Math.max(clients.value.length - visibleClients.length, 0)

  return (
    <div
      className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4"
      data-widget="recent-clients"
    >
      <FitTable className={CLIENTS_SLOT_CLASS}>
        <TableHead>
          <TableRow>
            <TableHeader className={fitTableColPrimary}>Client</TableHeader>
            <TableHeader className={fitTableColCompact}>Exposure</TableHeader>
            <TableHeader className={fitTableColCompact}>KYC</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleClients.map((client) => (
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-console-line-soft pt-3">
        <p className="text-xs text-fg-tertiary">
          {hiddenClients > 0
            ? `${hiddenClients} more client${pluralSuffix(hiddenClients)} available in the directory.`
            : 'Latest client snapshot.'}
        </p>
        <HearstSecondaryAction href="/admin/clients">View all clients</HearstSecondaryAction>
      </div>
    </div>
  )
}
