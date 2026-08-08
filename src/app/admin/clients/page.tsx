import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import { Button } from '@/components/catalyst/button'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { ChartFrame } from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { DATA_COVERAGE_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import type { ClientIssue } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  BuildingLibraryIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  UsersIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

const ISSUE_LABEL: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'No vault assigned',
  COMPLIANCE_REVIEW_PENDING: 'Compliance review pending',
  VAULT_INACTIVE: 'Vault inactive',
  DEPLOYMENT_BLOCKED: 'Deployment blocked',
  MISSING_INVESTOR_RECORD: 'No investor record',
  NO_ACTIVE_STRATEGY: 'No active strategy',
}

const MISSING_FROM_SOURCE = [
  'Per-vault client identifier (owner not carried by /vault)',
  'Compliance status joined on the same row (see /admin/compliance)',
] as const

/**
 * Clients — annuaire admin via GET /api/v1/clients.
 * Liste vide LIVE ≠ endpoint manquant.
 */
export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  // KPI dérivés de l'Availability réelle — jamais de valeur inventée, jamais de ?? 0.
  const complianceDirectory = mapAvailability(registry.compliance, (rows) =>
    rows.length === 0 ? 'Empty queue' : formatNumber(rows.length),
  )
  const clientExceptionCount = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const clientCount = measuredCount(registry.clients)
  const reachableVaults = mapAvailability(registry.vaults, (rows) => formatNumber(rows.length))

  const clients = isAvailable(registry.clients) ? registry.clients.value : null
  const exceptions = isAvailable(registry.clientExceptions) ? registry.clientExceptions.value : null

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'clients', title: 'Clients listed', value: clientCount, icon: UsersIcon },
    { id: 'anomalies', title: 'Anomalies', value: clientExceptionCount, icon: ExclamationTriangleIcon },
    { id: 'vaults', title: 'Reachable vaults', value: reachableVaults, icon: BuildingLibraryIcon },
    {
      id: 'compliance',
      title: 'Compliance',
      value: complianceDirectory,
      unit: 'files',
      icon: ClipboardDocumentCheckIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Clients"
        description="Investor directory and client signals from the backend."
        kpis={kpis}
      />

      {/* ── PLACEHOLDER GRAPHIQUE : l'annuaire /api/v1/clients ne porte pas de
          série numérique traçable (id + libellé seulement). Le ChartFrame est
          donc rendu dans son état vide/indisponible selon l'Availability réelle,
          sans jamais fabriquer de série. ──────────────────────────────────── */}
      <ChartFrame
        question="How are clients distributed over time?"
        unite="number of clients, per period"
        expectedSource={['GET /api/v1/clients']}
        etat={
          clients === null
            ? {
                type: 'unavailable',
                explication: 'The client directory read did not succeed — no series can be plotted.',
              }
            : {
                type: 'empty',
                explication:
                  'The /api/v1/clients directory carries no time series — nothing to plot today.',
              }
        }
      />

      {clients === null ? (
        <DataTableShell
          title="Directory"
          description="Source /api/v1/clients only."
          source={{
            quoi: 'Client directory',
            detail: 'The directory read did not succeed — no row can be shown.',
            requis: ['GET /api/v1/clients'],
          }}
        />
      ) : clients.length === 0 ? (
        <DataTableShell
          title="Directory"
          description="Source /api/v1/clients only."
          calme="No investor in the database for this directory."
        />
      ) : (
        <DataTableShell
          title="Directory"
          description="Source /api/v1/clients only."
          count={`${clients.length} client(s)`}
        >
          <TableHead>
            <TableRow>
              <TableHeader>Identifier</TableHeader>
              <TableHeader>Label</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-sm">{client.id}</TableCell>
                <TableCell className="font-medium">{client.label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      {exceptions === null ? (
        <Callout tone="warning" title="Unreadable client anomalies">
          Client signals could not be read from the backend.
        </Callout>
      ) : (
        <DataTableShell
          title="Client anomalies"
          description="Signals derived from the investor record (GET /api/v1/dashboard)."
          count={exceptions.length > 0 ? `${exceptions.length} to review` : undefined}
          calme={exceptions.length === 0 ? 'No client signal to review for now.' : undefined}
        >
          {exceptions.length > 0 ? (
            <>
              <TableHead>
                <TableRow>
                  <TableHeader>Client</TableHeader>
                  <TableHeader>Signal</TableHeader>
                  <TableHeader className="text-right">Action</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {exceptions.map((exception, index) => (
                  <TableRow key={exception.clientId ?? `${exception.issue}-${index}`}>
                    <TableCell className="font-medium">{exception.clientLabel}</TableCell>
                    <TableCell>
                      <Badge color="amber">{ISSUE_LABEL[exception.issue]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button plain href={exception.actionHref}>
                        {exception.actionLabel}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : null}
        </DataTableShell>
      )}

      <Text>
        Vault ownership: not carried by /vault — see{' '}
        <Link href={VAULT_REGISTRY_ENTRY.href} className="underline">
          {VAULT_REGISTRY_ENTRY.label}
        </Link>
        {' · '}
        <Link href={DATA_COVERAGE_ENTRY.href} className="underline">
          {DATA_COVERAGE_ENTRY.label}
        </Link>
      </Text>

      <SectionCard title="Missing at source" tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
          {MISSING_FROM_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <DataTableShell title="Source activity" description="Six most recent sources.">
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.slice(0, 6).map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  )
}
