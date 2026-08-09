import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { Callout, DataTableShell, SectionCard, fitTableColPrimary } from '@/components/compositions'
import { ChartFrame } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import {
  available,
  mapAvailability,
  measuredCount,
  unavailable,
  type Availability,
} from '@/lib/vaults/model'
import {
  CheckBadgeIcon,
  LinkIcon,
  TagIcon,
  UsersIcon,
} from '@heroicons/react/16/solid'
import { SimulatedBadge } from '../_shared'

type Resolu<T> = Readonly<{ status?: string; value: T | null; reason?: string | null }>

type ClientWire = Readonly<{ id?: string | null; label?: string | null }>

type ClientsReponse = Readonly<{ clients?: Resolu<readonly ClientWire[]> }>

type ClientRow = Readonly<{ id: string; label: string }>

function libelleClient(label: string | null | undefined, id: string): string {
  if (label !== null && label !== undefined && label !== '') return label
  return id
}

function clientsFromResponse(
  clientsRes: Awaited<ReturnType<typeof callBackend<ClientsReponse>>>,
): readonly ClientRow[] | null {
  if (!clientsRes.ok) return null
  const bloc = clientsRes.data.clients
  if (bloc?.status !== 'LIVE' || !Array.isArray(bloc.value)) return null
  const rows: ClientRow[] = []
  for (const c of bloc.value) {
    if (typeof c.id !== 'string' || c.id === '') continue
    rows.push({ id: c.id, label: c.label ?? c.id })
  }
  return rows
}

type ClientsBackendResult = Awaited<ReturnType<typeof callBackend<ClientsReponse>>>

function directoryLabelAvailability(
  rows: readonly ClientRow[] | null,
  match: ClientRow | null,
  clientsRes: ClientsBackendResult,
): Availability<string> {
  if (rows === null) {
    const reason = clientsRes.ok
      ? (clientsRes.data.clients?.reason ?? 'Directory unreadable')
      : 'No response'
    return unavailable({
      status: 'UNAVAILABLE',
      reason,
      endpoint: '/api/v1/clients',
    })
  }
  if (match !== null) {
    return available(match.label, { provenance: 'db' })
  }
  return unavailable({
    status: 'EMPTY',
    reason: 'Identifier absent from directory — the account may exist without being listed yet.',
    endpoint: '/api/v1/clients',
  })
}

function indexationStatusAvailability(
  rows: readonly ClientRow[] | null,
  match: ClientRow | null,
): Availability<string> {
  if (rows === null) {
    return unavailable({
      status: 'UNAVAILABLE',
      reason: 'Directory unreadable',
      endpoint: '/api/v1/clients',
    })
  }
  if (match !== null) {
    return available('Indexed', { provenance: 'db' })
  }
  return available('Not indexed', { provenance: 'db' })
}

function directoryRowsAvailability(
  rows: readonly ClientRow[] | null,
): Availability<readonly ClientRow[]> {
  if (rows === null) {
    return unavailable({ endpoint: '/api/v1/clients' })
  }
  return available(rows)
}

/**
 * Détail d’un client simulé — lecture honnête via GET /api/v1/clients.
 * Aucune ligne inventée : si l’identifiant n’est pas encore dans l’annuaire,
 * l’absence est nommée. La présentation suit la grammaire admin premium
 * (en-tête → KPI → sections → table nommée) ; la lecture reste inchangée.
 */
export async function ClientSimulatorDetailView({ id }: Readonly<{ id: string }>) {
  const clientsRes = await callBackend<ClientsReponse>('clients')
  const rows = clientsFromResponse(clientsRes)
  const match = rows?.find((c) => c.id === id) ?? null
  const directoryRows = directoryRowsAvailability(rows)

  const directoryLabel = directoryLabelAvailability(rows, match, clientsRes)
  const indexationStatus = indexationStatusAvailability(rows, match)
  const directorySize = measuredCount(directoryRows)
  const sourceState = mapAvailability(directoryRows, () => 'GET /api/v1/clients')

  const displayName = match !== null ? libelleClient(match.label, id) : id

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'indexation', title: 'Indexation', value: indexationStatus, icon: CheckBadgeIcon },
    { id: 'libelle', title: 'Label', value: directoryLabel, icon: TagIcon },
    { id: 'annuaire', title: 'Directory', value: directorySize, icon: UsersIcon },
    { id: 'source', title: 'Source', value: sourceState, icon: LinkIcon },
  ]

  return (
    <div className="space-y-8">
      {/* ── EN-TÊTE ──────────────────────────────────────────────── */}
      <AdminPageHeader
        title={displayName}
        description="Join on GET /api/v1/clients — named absence if not indexed."
        kpis={kpis}
      />

      {/* ── GRAPHIQUE (état honnête : cette fiche n'expose aucune série) ─ */}
      <ChartFrame
        question="Simulated client activity"
        unite="events per day"
        etat={{
          type: 'empty',
          explication:
            'GET /api/v1/clients returns only this client identity — no time series to plot today.',
        }}
      />

      {/* ── DIRECTORY RECORD (named table: match / absence / unreadable) ─ */}
      <DataTableShell
        title="Directory record"
        description="Joined by identifier on GET /api/v1/clients — the only source of this record."
        count={match !== null ? '1 match' : undefined}
        source={
          rows === null
            ? {
                quoi: 'Directory record',
                detail: 'The directory could not be read — cannot join this identifier.',
                requis: ['GET /api/v1/clients (admin role)'],
              }
            : undefined
        }
        calme={
          rows !== null && match === null
            ? 'Identifier not in the directory yet.'
            : undefined
        }
      >
        {match !== null ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader className={fitTableColPrimary}>Field</TableHeader>
                <TableHeader className={fitTableColPrimary}>Value</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Identifier</TableCell>
                <TableCell className="font-mono text-sm">{match.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Label</TableCell>
                <TableCell>{match.label}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Marker</TableCell>
                <TableCell>
                  <SimulatedBadge />
                </TableCell>
              </TableRow>
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      {/* Named absence when directory is readable but identifier is missing */}
      {rows !== null && match === null ? (
        <Callout tone="warning" title="Absent from directory">
          The identifier <span className="font-mono">{id}</span> does not appear in the current response
          from GET /api/v1/clients. The account may exist without being indexed yet — no row is invented
          here.
        </Callout>
      ) : null}

      {/* ── SECTION éditoriale : identité du compte (pas des compteurs) ─ */}
      <SectionCard title="Account identity" hint="Stable markers for the simulated client — UI definition." tone="plain">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SimulatedBadge />
            <span className="font-mono text-sm text-fg-tertiary dark:text-fg-secondary">{id}</span>
          </div>
          <Text>
            This account was created via POST /api/v1/admin/users. The service never returns its password;
            only the identifier and directory label published by the registry are shown here.
          </Text>
        </div>
      </SectionCard>

      {/* ── LIENS de navigation ──────────────────────────────────── */}
      <SectionCard title="Continue" tone="plain">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="neutral">Simulator</Badge>
          <Text>
            <Link href="/admin/client-simulator/new" className="underline">
              Create another simulated client
            </Link>
            {' · '}
            <Link href="/admin/clients" className="underline">
              Client directory
            </Link>
          </Text>
        </div>
      </SectionCard>
    </div>
  )
}
