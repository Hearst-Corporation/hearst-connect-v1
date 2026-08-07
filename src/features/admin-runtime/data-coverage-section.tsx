import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import {
  StatCard,
  StatGrid,
  SectionCard,
  DataTableShell,
} from '@/components/compositions'
import { ChartFrame, HearstDonutChart, type DonutSlice } from '@/components/charts'
import { callBackend, statusFromMeta } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { motifLisible, etatSourceLisible } from '@/lib/mouvements'
import { mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'

/**
 * Couverture des données — section de `/admin/runtime`.
 *
 * Ancienne route dédiée supprimée : cette section reste sous le hub Service
 * avec les sondes runtime — ce que le backend sert réellement.
 */

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

const SURFACE_NAME: Record<string, string> = {
  identity: 'Identité de l’investisseur',
  position: 'Position détenue',
  distributions: 'Distributions versées',
  activity: 'Activité du compte',
  proofs: 'Preuve de réserves',
  allocation: 'Allocation du portefeuille',
  subscription: 'Conditions de souscription',
  alerts: 'Alertes actives',
  capacity: 'Capacité du fonds',
  reserve: 'Réserve de liquidités',
  performance: 'Performance',
  mining: 'Production de la flotte',
  rebalancing: 'Rééquilibrage',
  vault: 'Coffre d’actifs',
  strategies: 'Stratégies actives',
  recentEvents: 'Mouvements récents',
  engine: 'Moteur de minage',
  aiExperts: 'Analyse assistée par IA',
}

const surfaceName = (key: string): string => SURFACE_NAME[key] ?? key

type CoverageTier = 'served' | 'partial' | 'notOpened'

const TIER_TITLE: Record<CoverageTier, string> = {
  served: 'Servi',
  partial: 'Partiellement servi',
  notOpened: 'Non ouvert',
}

const TIER_EXPLANATION: Record<CoverageTier, string> = {
  served: 'Ces surfaces renvoient une valeur exploitable. Vous pouvez vous y fier.',
  partial:
    'Ces surfaces répondent, mais sans valeur : le service sait quoi renvoyer, il n’a simplement rien à dire aujourd’hui.',
  notOpened: 'Ces surfaces ne sont pas encore ouvertes. Rien n’en est attendu pour l’instant.',
}

function tierFromStatus(status: string): CoverageTier {
  if (status === 'LIVE') return 'served'
  if (status === 'PARTIAL' || status === 'STALE' || status === 'SNAPSHOT' || status === 'EMPTY') return 'partial'
  return 'notOpened'
}

const TIER_ORDER: readonly CoverageTier[] = ['served', 'partial', 'notOpened']

type Surface = { readonly key: string; readonly name: string; readonly tier: CoverageTier; readonly reason: string | undefined }
type SourceActivityRow = {
  readonly endpointId: string
  readonly label: string
  readonly status: string
  readonly detail: string | null
}

const countIn = (surfaces: readonly Surface[], tier: CoverageTier): number =>
  surfaces.filter((s) => s.tier === tier).length

export async function DataCoverageSection({ compteLabel }: Readonly<{ compteLabel: string }>) {
  const response = await callBackend<Record<string, unknown>>('dashboard')
  const registry = await loadAdminRegistry(compteLabel, { movementLimit: MOVEMENT_WINDOW })
  const aggregate = response.ok ? response.data : null

  const surfaces =
    aggregate === null
      ? []
      : Object.entries(aggregate)
          .filter((entry): entry is [string, ResolvedField] => isResolvedField(entry[1]))
          .map(([key, resolved]) => ({
            key,
            name: surfaceName(key),
            tier: tierFromStatus(resolved.status),
            reason: motifLisible(resolved.reason),
          }))
  const ordered = TIER_ORDER.flatMap((tier) => surfaces.filter((surface) => surface.tier === tier))

  const coverageUnreadable = unavailable({
    endpoint: '/api/v1/dashboard',
    status: 'UNAVAILABLE',
    reason: 'dashboard_source_unreachable',
  })
  const dashboardEndpoint = '/api/v1/dashboard'
  const dashboardBloc =
    response.ok && aggregate !== null
      ? { status: response.meta?.status ?? 'LIVE', value: aggregate, reason: null }
      : null
  const dashboardSource = availabilityFromResolu(dashboardBloc, dashboardEndpoint)

  const asCount = (n: number): Availability<string> =>
    aggregate === null ? coverageUnreadable : mapAvailability(dashboardSource, () => String(n))
  const served = countIn(surfaces, 'served')
  const partial = countIn(surfaces, 'partial')
  const notOpened = countIn(surfaces, 'notOpened')
  const servedCell = asCount(served)
  const partialCell = asCount(partial)
  const notOpenedCell = asCount(notOpened)
  const totalCell = asCount(surfaces.length)

  // Répartition RÉELLE de la couverture par palier : chaque part est le décompte
  // effectif des surfaces du tableau de bord dans ce palier (regroupement d'une
  // donnée réelle, pas un compteur inventé), et le total est le nombre réel de
  // surfaces énumérées. Le donut ne filtre que les parts > 0 ; on ne le trace
  // qu'à partir de deux paliers renseignés, sinon la table seule reste plus
  // honnête qu'un anneau à une part.
  const coverageSlices: readonly DonutSlice[] = [
    { label: TIER_TITLE.served, value: served },
    { label: TIER_TITLE.partial, value: partial },
    { label: TIER_TITLE.notOpened, value: notOpened },
  ]
  const filledTiers = coverageSlices.filter((slice) => slice.value > 0).length
  const coverageCell: Availability<string> =
    aggregate === null || surfaces.length === 0
      ? coverageUnreadable
      : mapAvailability(dashboardSource, () => `${Math.round((served / surfaces.length) * 100)}%`)

  const sourceState: Availability<string> = response.ok
    ? mapAvailability(dashboardSource, () => etatSourceLisible(statusFromMeta(response.meta)))
    : unavailable({
        endpoint: dashboardEndpoint,
        status: 'UNAVAILABLE',
        reason: 'dashboard_source_unreachable',
      })

  return (
    <div className="space-y-10">
      <SectionCard
        title="Couverture des données"
        hint="Quelles surfaces produit sont réellement servies aujourd’hui. Les états sont affichés exactement tels que le backend les rapporte — champ le plus dégradé d’abord."
        tone="plain"
      >
        <StatGrid label="Couverture des surfaces" columns={3}>
          <StatCard titre="Servi" valeur={servedCell} showRoute />
          <StatCard titre="Partiel" valeur={partialCell} showRoute />
          <StatCard titre="Non ouvert" valeur={notOpenedCell} showRoute />
          <StatCard titre="Surfaces totales" valeur={totalCell} showRoute />
          <StatCard titre="Taux de couverture" valeur={coverageCell} showRoute />
          <StatCard titre="État de la source" valeur={sourceState} showRoute />
        </StatGrid>
      </SectionCard>

      <ChartFrame
        question="Comment la couverture se répartit-elle par palier ?"
        unite="nombre de surfaces, par palier"
        etat={
          aggregate === null
            ? { type: 'indisponible', explication: 'Le point d’accès du tableau de bord n’a pas répondu.' }
            : surfaces.length === 0
              ? { type: 'vide', explication: 'Le tableau de bord n’a exposé aucune surface.' }
              : filledTiers < 2
                ? {
                    type: 'vide',
                    explication:
                      'Un seul palier est renseigné : la liste par surface reste plus lisible qu’un anneau à une part.',
                  }
                : { type: 'tracee' }
        }
        expectedSource={['GET /api/v1/dashboard']}
      >
        {aggregate !== null && filledTiers >= 2 ? (
          <HearstDonutChart slices={coverageSlices} unit="surfaces" />
        ) : null}
      </ChartFrame>

      {aggregate === null ? (
        <SectionCard
          title="Surface par surface"
          hint="Dix-huit surfaces dans une seule liste, ordonnées par palier. Aucun statut n’est requalifié côté front."
        >
          <Text>
            Le point d’accès du tableau de bord n’a pas répondu. Aucune couverture n’est déduite.
          </Text>
        </SectionCard>
      ) : (
        <DataTableShell
          title="Surface par surface"
          description="Dix-huit surfaces dans une seule liste, ordonnées par palier. Aucun statut n’est requalifié côté front."
        >
          <TableHead>
            <TableRow>
              <TableHeader>Surface</TableHeader>
              <TableHeader>État</TableHeader>
              <TableHeader>Motif</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map((surface) => (
              <TableRow key={surface.key}>
                <TableCell className="font-medium">{surface.name}</TableCell>
                <TableCell>{TIER_TITLE[surface.tier]}</TableCell>
                <TableCell className="text-zinc-500">{surface.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      <SectionCard title="Signification des paliers">
        <DescriptionList>
          {TIER_ORDER.map((tier) => (
            <div key={tier} className="contents">
              <DescriptionTerm>{TIER_TITLE[tier]}</DescriptionTerm>
              <DescriptionDetails>
                {countIn(surfaces, tier)} — {TIER_EXPLANATION[tier]}
              </DescriptionDetails>
            </div>
          ))}
        </DescriptionList>
      </SectionCard>

      <DataTableShell
        title="Activité des sources"
        description="État des points d’accès backend, tel que le registre les rapporte."
      >
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>État</TableHeader>
            <TableHeader>Détail</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.map((source: SourceActivityRow) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
              <TableCell className="text-zinc-500">{source.detail ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  )
}
