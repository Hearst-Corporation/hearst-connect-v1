import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { AdminKpiSurface, type AdminKpiItem } from '@/components/admin/admin-kpi-surface'
import { ExceptionBanner, CalmState } from '@/components/admin/cockpit'
import { DistributionBarChart } from '@/components/admin/distribution-chart'
import { AdminBody, AdminPage, AdminSurfaceHeader } from '@/components/admin/typography'
import { PageHeader } from '@/components/admin/page-header'
import {
  AdminChart,
  AdminSection,
  AdminSourceAttendue,
  AdminStatusMatrix,
  AdminSurface,
  AdminTable,
  type StatusMatrixRow,
} from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { ilYA, libelleMouvement, montantUsdc, motifLisible, phraseMouvement } from '@/lib/mouvements'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Accueil' }
export const dynamic = 'force-dynamic'

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Dashboard = {
  readonly capacity?: Resolu<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
  readonly performance?: Resolu<{ navPerShare: string | null; totalReturnBps: number | null }>
  readonly strategies?: Resolu<readonly { pocket: string; targetBps: number; actualBps: number | null }[]>
}

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
  readonly txHash?: string
  readonly blockNumber?: string
}

type Evenements = { readonly events?: Resolu<readonly Mouvement[]> }

type Runtime = {
  readonly databaseStatus?: string
  readonly contractStatus?: string
  readonly indexerStatus?: string
  readonly environment?: string
  readonly uptimeSeconds?: number
  readonly chainId?: number
}

function pourcentage(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

const estResolu = (v: unknown): v is Resolu<unknown> =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

function statutService(ready: boolean, runtimeOk: boolean): StatusMatrixRow[] {
  return [
    {
      id: 'ready',
      label: 'Disponibilité',
      status: ready ? 'LIVE' : 'UNAVAILABLE',
      detail: ready ? 'Service joignable' : 'Non prêt',
      ton: ready ? 'sain' : 'critique',
    },
    {
      id: 'runtime',
      label: 'État runtime',
      status: runtimeOk ? 'LIVE' : 'UNAVAILABLE',
      detail: runtimeOk ? 'Réponse reçue' : 'Pas de réponse',
      ton: runtimeOk ? 'sain' : 'critique',
    },
  ]
}

export default async function Page() {
  const [dashboard, evenements, disponibilite, runtime] = await Promise.all([
    callBackend<Dashboard>('dashboard'),
    callBackend<Evenements>('series1-events', { params: { limit: 10 } }),
    callBackend<{ ready?: boolean }>('ready'),
    callBackend<Runtime>('runtime'),
  ])

  const serviceIndisponible = !disponibilite.ok || disponibilite.data.ready !== true
  const d = dashboard.ok ? dashboard.data : null
  const r = runtime.ok ? runtime.data : null

  const surfaces = d === null ? [] : Object.values(d).filter(estResolu)
  const incompletes = surfaces.filter((s) => s.status !== 'LIVE')
  const motif = incompletes.map((s) => motifLisible(s.reason)).find((m) => m !== undefined)

  const capacite = d?.capacity?.value
  const perf = d?.performance?.value
  const strategies = d?.strategies?.value

  const poches: PocheAllocation[] =
    strategies === null || strategies === undefined
      ? []
      : strategies.map((s) => ({
          poche: s.pocket,
          cible: s.targetBps / 100,
          reel: s.actualBps === null ? null : s.actualBps / 100,
        }))

  const mouvements = evenements.ok ? evenements.data.events?.value : null
  const dernierMouvement = mouvements?.[0]

  const repartitionMouvements = new Map<string, number>()
  if (mouvements) {
    for (const m of mouvements) {
      const nom = libelleMouvement(m.eventName)
      const deja = repartitionMouvements.get(nom)
      repartitionMouvements.set(nom, deja === undefined ? 1 : deja + 1)
    }
  }
  const barresMouvements = [...repartitionMouvements.entries()].map(([nom, valeur]) => ({ nom, valeur }))
  const nombreMouvements = mouvements?.length

  const repartitionStrategies = strategies
    ? strategies
        .filter((s) => s.actualBps !== null)
        .map((s) => ({
          nom: s.pocket,
          valeur: (s.actualBps as number) / 100,
        }))
    : []

  const matrixRows: StatusMatrixRow[] = [
    ...statutService(disponibilite.ok && disponibilite.data.ready === true, runtime.ok),
    {
      id: 'db',
      label: 'Base de données',
      status: r?.databaseStatus === 'ready' ? 'LIVE' : r ? 'PARTIAL' : 'UNAVAILABLE',
      ton: r?.databaseStatus === 'ready' ? 'sain' : 'attention',
    },
    {
      id: 'indexer',
      label: 'Indexeur',
      status: r?.indexerStatus === 'RUNNING' ? 'LIVE' : r ? 'PARTIAL' : 'UNAVAILABLE',
      ton: r?.indexerStatus === 'RUNNING' ? 'sain' : 'attention',
    },
    {
      id: 'contract',
      label: 'Contrat',
      status: r?.contractStatus === 'CONFIGURED' ? 'LIVE' : r ? 'PARTIAL' : 'UNAVAILABLE',
      ton: r?.contractStatus === 'CONFIGURED' ? 'sain' : 'attention',
    },
  ]

  const surfacesDashboard: StatusMatrixRow[] = incompletes.map((s, i) => ({
    id: `surface-${i}`,
    label: 'Surface partielle',
    status: s.status as never,
    detail: motifLisible(s.reason) ?? s.reason ?? undefined,
    ton: 'attention',
  }))

  const kpiSecondaires: AdminKpiItem[] = [
    {
      id: 'capacite',
      label: 'Capacité disponible',
      value: montantUsdc(capacite?.availableCapacity, 0),
      hint: 'availableCapacity · dashboard',
    },
    {
      id: 'utilisation',
      label: 'Taux d’utilisation',
      value: pourcentage(capacite?.utilizationBps),
      hint: 'utilizationBps',
    },
    {
      id: 'nav',
      label: 'Valeur de part',
      value: perf?.navPerShare ?? null,
      hint: 'navPerShare · dashboard',
    },
    {
      id: 'performance',
      label: 'Performance',
      value: pourcentage(perf?.totalReturnBps),
      hint: 'totalReturnBps',
      tone: perf?.totalReturnBps !== null && perf?.totalReturnBps !== undefined && perf.totalReturnBps > 0 ? 'success' : 'default',
    },
    {
      id: 'service',
      label: 'Service',
      value: serviceIndisponible ? 'Indisponible' : 'Disponible',
      hint: 'ready',
      tone: serviceIndisponible ? 'danger' : 'success',
    },
    {
      id: 'mouvement',
      label: 'Dernier mouvement',
      value: dernierMouvement ? phraseMouvement(dernierMouvement.eventName) : null,
      hint: dernierMouvement?.occurredAt ? ilYA(dernierMouvement.occurredAt) : undefined,
      tone: 'accent',
    },
    {
      id: 'sources',
      label: 'Sources dashboard',
      value: d ? `${surfaces.length - incompletes.length}/${surfaces.length} live` : null,
      hint: 'surfaces LIVE',
    },
  ]

  return (
    <AdminPage>
      <PageHeader
        title="Accueil"
        description="Vue consolidée du fonds, des mouvements récents et de l’état du service. Toute valeur provient du backend."
        endpointIds={['dashboard', 'series1-events', 'ready', 'runtime']}
      />

      {serviceIndisponible ? (
        <ExceptionBanner
          message="Le service ne répond pas ou n’est pas prêt. Les valeurs ci-dessous peuvent être incomplètes."
          href="/admin/runtime"
          actionLabel="Voir l’état détaillé"
        />
      ) : null}

      {/* Résumé principal */}
      <AdminSection title="Résumé" description="Métriques du fonds et disponibilité du service">
        <AdminKpiSurface
          hero={{
            id: 'encours',
            label: 'Encours du portefeuille',
            value: montantUsdc(capacite?.totalAssets, 0),
            hint: 'totalAssets · GET /api/v1/dashboard',
            tone: 'accent',
          }}
          items={kpiSecondaires}
        />
      </AdminSection>

      {/* Attention */}
      <AdminSection title="Attention" description="Surfaces incomplètes et files en attente de source">
        {incompletes.length === 0 && !serviceIndisponible ? (
          <CalmState message="Rien ne demande votre attention sur les surfaces branchées." />
        ) : null}
        {incompletes.length > 0 ? (
          <div>
            <AdminStatusMatrix
              title={`${incompletes.length} surface${incompletes.length > 1 ? 's' : ''} sans donnée exploitable`}
              rows={surfacesDashboard}
            />
            {motif ? (
              <AdminBody className="mt-3">
                Motif le plus fréquent : {motif}.
                <Link href="/admin/dashboard" className="ml-2 text-brand-accent hover:underline">
                  Examiner le détail →
                </Link>
              </AdminBody>
            ) : null}
          </div>
        ) : null}
        <AdminSourceAttendue
          quoi="Files de conformité et d’approbation — source en attente"
          detail="Les compteurs restent vides tant qu’aucune route KYC ou approbation n’est exposée."
          requis={['Lecture des dossiers de conformité', 'Lecture des demandes d’approbation financière']}
        />
      </AdminSection>

      {/* Graphiques */}
      <AdminSection title="Visualisations" description="Données instantanées — pas de série temporelle inventée">
        <div className="grid gap-4 lg:grid-cols-2">
          {poches.length > 0 ? (
            <AdminSurface>
              <AdminSurfaceHeader
                title="Allocation cible vs réelle"
                description="dashboard · strategies"
              />
              <AllocationChart poches={poches} />
            </AdminSurface>
          ) : (
            <AdminChart
              question="Allocation cible vs réelle"
              unite="% du portefeuille"
              provenance="GET /api/v1/dashboard"
              etat={{ type: 'vide', explication: 'Aucune poche stratégique lisible dans le dashboard.' }}
            />
          )}

          {repartitionStrategies.length > 0 ? (
            <AdminSurface>
              <AdminSurfaceHeader title="Répartition des stratégies" description="actualBps par poche" />
              <DistributionBarChart barres={repartitionStrategies} unit=" %" />
            </AdminSurface>
          ) : (
            <AdminChart
              question="Répartition des stratégies"
              unite="% constaté"
              provenance="GET /api/v1/dashboard"
              etat={{ type: 'vide', explication: 'Aucun solde de poche constaté sur la chaîne.' }}
            />
          )}

          {barresMouvements.length > 0 ? (
            <AdminSurface>
              <AdminSurfaceHeader
                title="Distribution des mouvements"
                description={
                  nombreMouvements !== undefined ? `${nombreMouvements} derniers · series1-events` : 'series1-events'
                }
              />
              <DistributionBarChart barres={barresMouvements} />
            </AdminSurface>
          ) : (
            <AdminChart
              question="Distribution des mouvements"
              unite="occurrences"
              provenance="GET /api/v1/series1/events"
              etat={{ type: 'vide', explication: 'Aucun mouvement récent indexé.' }}
            />
          )}

          <AdminSurface>
            <AdminStatusMatrix title="État des services" rows={matrixRows} />
            {r?.environment ? (
              <p className="border-t border-white/5 px-5 py-3 text-xs/5 text-brand-muted sm:px-6">
                Environnement {r.environment}
                {r.chainId ? ` · chaîne ${r.chainId}` : null}
              </p>
            ) : null}
          </AdminSurface>
        </div>
      </AdminSection>

      {/* Activité récente */}
      <AdminSection title="Activité récente" description="Mouvements indexés Series 1">
        {mouvements === null || mouvements === undefined || mouvements.length === 0 ? (
          <CalmState message="Aucun mouvement relevé récemment." />
        ) : (
          <AdminSurface>
            <AdminTable
              rows={mouvements}
              keyFn={(m) => m.id}
              columns={[
                {
                  key: 'type',
                  header: 'Type',
                  cell: (m) => <span className="text-brand-foreground">{phraseMouvement(m.eventName)}</span>,
                },
                {
                  key: 'montant',
                  header: 'Montant',
                  cell: (m) => (
                    <span className="font-semibold text-brand-accent tabular-nums">
                      {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic, 2) : '—'}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  cell: (m) => <span className="text-brand-muted">{ilYA(m.occurredAt)}</span>,
                },
              ]}
            />
            <div className="border-t border-white/5 px-5 py-3 sm:px-6">
              <Link href="/admin/operations" className="text-sm text-brand-accent hover:underline">
                Voir le registre complet →
              </Link>
            </div>
          </AdminSurface>
        )}
      </AdminSection>
    </AdminPage>
  )
}
