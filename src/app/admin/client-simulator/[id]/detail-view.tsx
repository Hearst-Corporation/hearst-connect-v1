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
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { ChartFrame } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import { available, mapAvailability, measuredCount, unavailable } from '@/lib/vaults/model'
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

  // Label annuaire : présent si l'identifiant est indexé, absence nommée sinon.
  const directoryLabel =
    rows === null
      ? unavailable({
          status: 'UNAVAILABLE',
          reason: clientsRes.ok
            ? (clientsRes.data.clients?.reason ?? 'Directory unreadable')
            : 'No response',
          endpoint: '/api/v1/clients',
        })
      : match !== null
        ? available(match.label, { provenance: 'db' })
        : unavailable({
            status: 'EMPTY',
            reason: 'Identifier absent from directory — the account may exist without being listed yet.',
            endpoint: '/api/v1/clients',
          })

  // Statut d'indexation : dérivé de l'Availability réelle, jamais forcé.
  const indexationStatus =
    rows === null
      ? unavailable({
          status: 'UNAVAILABLE',
          reason: 'Directory unreadable',
          endpoint: '/api/v1/clients',
        })
      : match !== null
        ? available('Indexed', { provenance: 'db' })
        : available('Not indexed', { provenance: 'db' })

  // Taille de l'annuaire : compte mesuré, absence propagée (jamais un zéro inventé).
  const directorySize = measuredCount(rows === null ? unavailable({ endpoint: '/api/v1/clients' }) : available(rows))
  const sourceState = mapAvailability(
    rows === null ? unavailable({ endpoint: '/api/v1/clients' }) : available(rows),
    () => 'GET /api/v1/clients',
  )

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

      {/* ── FICHE ANNUAIRE (table nommée : match / absence / illisible) ─ */}
      <DataTableShell
        title="Fiche annuaire"
        description="Jointure par identifiant sur GET /api/v1/clients — la seule source de cette fiche."
        count={match !== null ? '1 correspondance' : undefined}
        source={
          rows === null
            ? {
                quoi: 'Fiche annuaire',
                detail: 'The directory could not be read — cannot join this identifier.',
                requis: ['GET /api/v1/clients (admin role)'],
              }
            : undefined
        }
        calme={
          rows !== null && match === null
            ? 'Identifier absent de l’annuaire pour l’instant.'
            : undefined
        }
      >
        {match !== null ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader>Champ</TableHeader>
                <TableHeader>Valeur</TableHeader>
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
                <TableCell className="font-medium">Marqueur</TableCell>
                <TableCell>
                  <SimulatedBadge />
                </TableCell>
              </TableRow>
            </TableBody>
          </>
        ) : null}
      </DataTableShell>

      {/* ── ABSENCE NOMMÉE quand indexé mais pas trouvé (véracité) ── */}
      {rows !== null && match === null ? (
        <Callout tone="warning" title="Absent de l’annuaire">
          The identifier <span className="font-mono">{id}</span> does not appear in the current response
          de GET /api/v1/clients. Le compte peut exister sans être encore indexé — aucune ligne n’est
          inventée ici.
        </Callout>
      ) : null}

      {/* ── SECTION éditoriale : identité du compte (pas des compteurs) ─ */}
      <SectionCard title="Account identity" hint="Stable markers for the simulated client — UI definition." tone="plain">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <SimulatedBadge />
            <span className="font-mono text-sm text-zinc-500 dark:text-zinc-400">{id}</span>
          </div>
          <Text>
            Ce compte a été créé via POST /api/v1/admin/users. Le service ne restitue jamais son mot de
            passe ; seuls l’identifiant et le libellé publiés par l’annuaire sont affichés ici.
          </Text>
        </div>
      </SectionCard>

      {/* ── LIENS de navigation ──────────────────────────────────── */}
      <SectionCard title="Poursuivre" tone="plain">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="zinc">Simulateur</Badge>
          <Text>
            <Link href="/admin/client-simulator/new" className="underline">
              Créer un autre client simulé
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
