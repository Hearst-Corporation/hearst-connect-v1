import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { ClientsDirectory } from '@/components/admin/clients-directory'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, DataTableShell } from '@/components/compositions'
import { loadAdminClientsDirectory, type AdminRecentClient } from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import { isAvailable, measuredCount } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { UsersIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — operational directory.
 * Prefer GET /api/v1/admin/clients/recent (exposure + Som KYC).
 * Fall back to GET /api/v1/clients (id + label) when the rich read is empty/unavailable.
 * No Create client button — POST /api/v1/admin/users creates an application user, not a client record.
 */

function toDirectoryRows(
  recent: readonly AdminRecentClient[],
): readonly AdminRecentClient[] {
  return recent
}

export default async function Page() {
  const session = await requireSession()
  const [recent, registry] = await Promise.all([
    loadAdminClientsDirectory(100),
    loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW }),
  ])

  const richRows = isAvailable(recent) ? recent.value : null
  const thinRows = isAvailable(registry.clients) ? registry.clients.value : null

  const useRich = richRows !== null && richRows.length > 0
  const useThin = !useRich && thinRows !== null

  const listedCount = useRich
    ? measuredCount(recent)
    : useThin
      ? measuredCount(registry.clients)
      : richRows !== null
        ? measuredCount(recent)
        : measuredCount(registry.clients)

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'clients', title: 'Clients listed', value: listedCount, icon: UsersIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Clients"
        description="Manage client accounts, exposure, vault relationships, and partner KYC status."
        kpis={kpis}
      />

      {useRich ? (
        <ClientsDirectory clients={toDirectoryRows(richRows)} />
      ) : useThin ? (
        thinRows.length === 0 ? (
          <Callout tone="info" title="No clients yet">
            No client records were returned for this directory.
          </Callout>
        ) : (
          <DataTableShell
            title="Directory"
            description="Identity from the client directory. Exposure and Som KYC appear when the admin read model returns them."
            count={`${thinRows.length} client(s)`}
          >
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Identifier</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {thinRows.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.label}</TableCell>
                  <TableCell className="font-mono text-sm text-fg-tertiary">{client.id}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </DataTableShell>
        )
      ) : (
        <Callout tone="warning" title="Client directory unavailable">
          Client records could not be read. Technical detail lives under{' '}
          <Link href="/admin/runtime" className="underline">
            Service
          </Link>
          .
        </Callout>
      )}

      <Text className="text-sm text-fg-tertiary dark:text-fg-secondary">
        Som provides KYC — status is read-only here. Source health:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
