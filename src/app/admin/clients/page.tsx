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
import { Callout, DataTableShell, fitTableColPrimary } from '@/components/compositions'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { loadAdminAssetScale, loadAdminClientsDirectory } from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import {
  isAvailable,
  measuredCount,
  type Availability,
  type ClientRef,
} from '@/lib/vaults/model'
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

type ClientsView =
  | Readonly<{ kind: 'rich'; listedCount: Availability<string>; clients: readonly AdminRecentClient[] }>
  | Readonly<{ kind: 'thin'; listedCount: Availability<string>; clients: readonly ClientRef[] }>
  | Readonly<{ kind: 'thin-empty'; listedCount: Availability<string> }>
  | Readonly<{ kind: 'unavailable'; listedCount: Availability<string> }>

function resolveClientsView(
  recent: Availability<readonly AdminRecentClient[]>,
  registryClients: Availability<readonly ClientRef[]>,
): ClientsView {
  const richRows = isAvailable(recent) ? recent.value : null
  const thinRows = isAvailable(registryClients) ? registryClients.value : null

  if (richRows !== null && richRows.length > 0) {
    return { kind: 'rich', listedCount: measuredCount(recent), clients: richRows }
  }

  if (thinRows !== null) {
    const listedCount = measuredCount(registryClients)
    if (thinRows.length === 0) {
      return { kind: 'thin-empty', listedCount }
    }
    return { kind: 'thin', listedCount, clients: thinRows }
  }

  const listedCount =
    richRows !== null ? measuredCount(recent) : measuredCount(registryClients)
  return { kind: 'unavailable', listedCount }
}

function ClientsMainContent({
  view,
  assetScale,
}: Readonly<{ view: ClientsView; assetScale: AdminAssetScale | null }>) {
  if (view.kind === 'rich') {
    return <ClientsDirectory clients={view.clients} assetScale={assetScale} />
  }

  if (view.kind === 'thin-empty') {
    return (
      <Callout tone="info" title="No clients yet">
        No client records were returned for this directory.
      </Callout>
    )
  }

  if (view.kind === 'thin') {
    return (
      <DataTableShell
        title="Directory"
        description="Identity from the client directory. Exposure and Som KYC appear when the admin read model returns them."
        count={`${view.clients.length} client(s)`}
      >
        <TableHead>
          <TableRow>
            <TableHeader className={fitTableColPrimary}>Client</TableHeader>
            <TableHeader className={fitTableColPrimary}>Identifier</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {view.clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.label}</TableCell>
              <TableCell className="font-mono text-sm text-fg-tertiary">{client.id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    )
  }

  return (
    <Callout tone="warning" title="Client directory unavailable">
      Client records could not be read. Technical detail lives under{' '}
      <Link href="/admin/runtime" className="underline">
        Service
      </Link>
      .
    </Callout>
  )
}

export default async function Page() {
  const session = await requireSession()
  const [recent, registry, assetScale] = await Promise.all([
    loadAdminClientsDirectory(100),
    loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW }),
    loadAdminAssetScale(),
  ])

  const view = resolveClientsView(recent, registry.clients)

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'clients', title: 'Clients listed', value: view.listedCount, icon: UsersIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Clients"
        description="Manage client accounts, exposure, vault relationships, and partner KYC status."
        kpis={kpis}
      />

      <ClientsMainContent view={view} assetScale={assetScale} />

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
