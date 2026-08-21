import { ClientsDirectory } from '@/components/admin/clients-directory'
import { DashCard, DashboardHeader, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, Callout, tableCol } from '@/components/compositions'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { loadAdminAssetScale, loadAdminClientsDirectory } from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import {
  available,
  isAvailable,
  measuredCount,
  unavailable,
  type Availability,
  type ClientRef,
} from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

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

/* ── Command-bar KPIs ────────────────────────────────────────────────────────
   Same status vocabulary as the directory filters, so the strip reads as the
   filter rail's summary. Counts are derived from the rows ALREADY loaded —
   rich-only KPIs render '—' when the directory falls back to the thin read. */

const KYC_PENDING = new Set(['PENDING', 'EN_ATTENTE', 'IN_REVIEW', 'IN_PROGRESS'])
const KYC_ATTENTION = new Set([
  'PENDING',
  'EN_ATTENTE',
  'IN_REVIEW',
  'IN_PROGRESS',
  'REJECTED',
  'DENIED',
  'REQUIRED',
  'EXPIRED',
  'HIGH_RISK',
])

function kycKey(status: string): string {
  return status.trim().toUpperCase()
}

function hasExposureAtomic(client: AdminRecentClient): boolean {
  if (client.currentExposureAtomic === null || client.currentExposureAtomic === '') return false
  const n = Number(client.currentExposureAtomic)
  return Number.isFinite(n) && n > 0
}

function richCount(
  view: ClientsView,
  match: (client: AdminRecentClient) => boolean,
): Availability<string> {
  if (view.kind !== 'rich') return unavailable()
  return available(String(view.clients.filter(match).length))
}

/** The command bar is the shared `DashboardHeader` — no local copy. */

/* ── Directory card ──────────────────────────────────────────────────────────
   ONE frozen box for every view: rich table, thin fallback, empty and
   unavailable states all render inside the same 592px slot, so the page
   geometry never jumps with the data. The link lives on the title row. */

const DIRECTORY_SLOT = 'h-[592px]'

function directorySubtitle(view: ClientsView): string | undefined {
  if (view.kind === 'rich') {
    return 'Partner KYC via Som — read only. Vault membership and created date live on the client record when available.'
  }
  if (view.kind === 'thin') {
    return 'Identity from the client directory. Exposure and Som KYC appear when the admin read model returns them.'
  }
  return undefined
}

function directoryAction(view: ClientsView): ReactNode {
  return (
    <span className="flex shrink-0 items-center gap-3">
      {view.kind === 'thin' ? (
        <Badge color="neutral">{`${view.clients.length} client(s)`}</Badge>
      ) : null}
      <PanelHeaderLink href="/admin/compliance">Compliance</PanelHeaderLink>
      <PanelHeaderLink href="/admin/runtime">Source health</PanelHeaderLink>
    </span>
  )
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
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-none">
        <AdminTable className="[&_table]:min-w-[40rem]">
          <TableHead>
            <TableRow>
              <TableHeader className={tableCol.primary}>Client</TableHeader>
              <TableHeader className={tableCol.hash}>Identifier</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {view.clients.map((client) => (
              <TableRow
                key={client.id}
                href={`/admin/client-simulator/${client.id}`}
                title={`Open ${client.label}`}
              >
                <TableCell className={tableCol.primary}>
                  <div className="truncate font-medium">{client.label}</div>
                </TableCell>
                <TableCell className={`${tableCol.hash} text-sm text-fg-tertiary`}>{client.id}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </AdminTable>
      </div>
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
    {
      id: 'with-exposure',
      title: 'With exposure',
      value: richCount(view, hasExposureAtomic),
      icon: BanknotesIcon,
    },
    {
      id: 'kyc-pending',
      title: 'KYC pending',
      value: richCount(view, (client) => KYC_PENDING.has(kycKey(client.kycStatus))),
      icon: ClockIcon,
    },
    {
      id: 'needs-attention',
      title: 'Needs attention',
      value: richCount(view, (client) => KYC_ATTENTION.has(kycKey(client.kycStatus))),
      icon: ExclamationTriangleIcon,
    },
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Clients"
        description="Manage client accounts, exposure, vault relationships, and partner KYC status."
        kpis={kpis}
      />

      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            contentClassName={DIRECTORY_SLOT}
            title="Directory"
            titleLevel={2}
            subtitle={directorySubtitle(view)}
            action={directoryAction(view)}
          >
            <ClientsMainContent view={view} assetScale={assetScale} />
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <Text className="text-sm text-fg-secondary">
        Som provides KYC — status is read-only here. Source health:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
