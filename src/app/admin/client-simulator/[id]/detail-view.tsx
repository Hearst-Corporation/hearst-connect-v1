import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminSurface } from '@/components/admin/surfaces'
import { AdminBody } from '@/components/admin/typography'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Callout, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { callBackend } from '@/lib/backend/client'
import { available, editorial, unavailable } from '@/lib/vaults/model'
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
 * l’absence est nommée.
 */
export async function ClientSimulatorDetailView({ id }: Readonly<{ id: string }>) {
  const clientsRes = await callBackend<ClientsReponse>('clients')
  const rows = clientsFromResponse(clientsRes)
  const match = rows?.find((c) => c.id === id) ?? null

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

  const displayName = match !== null ? libelleClient(match.label, id) : id

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title={displayName}
        description="Client créé via POST /api/v1/admin/users. Les champs ci-dessous proviennent uniquement de GET /api/v1/clients — jamais inventés."
      />

      <AdminSurface padding>
        <div className="flex flex-wrap items-center gap-3">
          <SimulatedBadge />
          <AdminBody className="font-mono text-sm">{id}</AdminBody>
        </div>
      </AdminSurface>

      <StatGrid label="Synthèse du client simulé" columns={3}>
        <StatCard titre="Identifiant" valeur={editorial(id)} />
        <StatCard titre="Libellé annuaire" valeur={directoryLabel} showRoute />
        <StatCard
          titre="Source"
          valeur={editorial(clientsRes.ok ? 'GET /api/v1/clients' : 'Indisponible')}
        />
      </StatGrid>

      <SectionCard title="Fiche annuaire" hint="Jointure par identifiant sur l’annuaire admin.">
        {match !== null ? (
          <DescriptionList>
            <DescriptionTerm>Identifiant</DescriptionTerm>
            <DescriptionDetails className="font-mono text-sm">{match.id}</DescriptionDetails>
            <DescriptionTerm>Libellé</DescriptionTerm>
            <DescriptionDetails>{match.label}</DescriptionDetails>
          </DescriptionList>
        ) : (
          <Callout tone="warning" title="Absent de l’annuaire">
            L’identifiant <span className="font-mono">{id}</span> n’apparaît pas dans la réponse
            actuelle de GET /api/v1/clients. Le compte peut exister sans être encore indexé — aucune
            ligne n’est inventée ici.
          </Callout>
        )}
      </SectionCard>

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
  )
}
