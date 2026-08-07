import { AdminPageHeader } from '@/components/admin/page-header'
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
import { Callout, DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { ChartFrame } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import { available, editorial, mapAvailability, measuredCount, unavailable } from '@/lib/vaults/model'
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

  // Libellé annuaire : présent si l'identifiant est indexé, absence nommée sinon.
  const directoryLabel =
    rows === null
      ? unavailable({
          status: 'UNAVAILABLE',
          reason: clientsRes.ok
            ? (clientsRes.data.clients?.reason ?? 'Annuaire illisible')
            : 'Aucune réponse',
          endpoint: '/api/v1/clients',
        })
      : match !== null
        ? available(match.label, { provenance: 'db' })
        : unavailable({
            status: 'EMPTY',
            reason: 'Identifiant absent de l’annuaire — le compte peut exister sans être encore listé.',
            endpoint: '/api/v1/clients',
          })

  // Statut d'indexation : dérivé de l'Availability réelle, jamais forcé.
  const indexationStatus =
    rows === null
      ? unavailable({
          status: 'UNAVAILABLE',
          reason: 'Annuaire illisible',
          endpoint: '/api/v1/clients',
        })
      : match !== null
        ? available('Indexé', { provenance: 'db' })
        : available('Non indexé', { provenance: 'db' })

  // Taille de l'annuaire : compte mesuré, absence propagée (jamais un zéro inventé).
  const directorySize = measuredCount(rows === null ? unavailable({ endpoint: '/api/v1/clients' }) : available(rows))
  const sourceState = mapAvailability(
    rows === null ? unavailable({ endpoint: '/api/v1/clients' }) : available(rows),
    () => 'GET /api/v1/clients',
  )

  const displayName = match !== null ? libelleClient(match.label, id) : id

  return (
    <div className="space-y-8">
      {/* ── EN-TÊTE ──────────────────────────────────────────────── */}
      <AdminPageHeader title={displayName} />

      {/* ── RANGÉE KPI (état de la jointure sur l'annuaire réel) ──── */}
      <StatGrid label="Synthèse du client simulé" columns={4}>
        <StatCard titre="Indexation" valeur={indexationStatus} hint="Présence dans l’annuaire admin" showRoute />
        <StatCard titre="Libellé annuaire" valeur={directoryLabel} hint="Nom porté par la source" showRoute />
        <StatCard titre="Annuaire" valeur={directorySize} hint="Clients recensés côté source" showRoute />
        <StatCard titre="Source" valeur={sourceState} hint="Route interrogée" showRoute />
      </StatGrid>

      {/* ── GRAPHIQUE (état honnête : cette fiche n'expose aucune série) ─ */}
      <ChartFrame
        question="Activité du client simulé"
        unite="événements par jour"
        etat={{
          type: 'vide',
          explication:
            'GET /api/v1/clients ne renvoie que l’identité de ce client — aucune série temporelle à tracer aujourd’hui.',
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
                detail: 'L’annuaire n’a pas pu être lu — impossible de joindre cet identifiant.',
                requis: ['GET /api/v1/clients (rôle admin)'],
              }
            : undefined
        }
        calme={
          rows !== null && match === null
            ? 'Identifiant absent de l’annuaire pour l’instant.'
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
                <TableCell className="font-medium">Identifiant</TableCell>
                <TableCell className="font-mono text-sm">{match.id}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Libellé</TableCell>
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
          L’identifiant <span className="font-mono">{id}</span> n’apparaît pas dans la réponse actuelle
          de GET /api/v1/clients. Le compte peut exister sans être encore indexé — aucune ligne n’est
          inventée ici.
        </Callout>
      ) : null}

      {/* ── SECTION éditoriale : identité du compte (pas des compteurs) ─ */}
      <SectionCard title="Identité du compte" hint="Repères stables du client simulé — définition UI." tone="plain">
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
              Annuaire clients
            </Link>
          </Text>
        </div>
      </SectionCard>
    </div>
  )
}
