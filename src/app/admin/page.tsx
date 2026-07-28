import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { AdminKpiSurface, type AdminKpiItem } from '@/components/admin/admin-kpi-surface'
import { CockpitFigure } from '@/components/admin/cockpit-figure'
import { ExceptionBanner, CalmState } from '@/components/admin/cockpit'
import { DistributionBarChart } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { UtilizationChart } from '@/components/admin/utilization-chart'
import { AdminChart, AdminSection, AdminSurface, AdminTable, type AdminTableColumn } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { ilYA, libelleMouvement, montantUsdc, phraseMouvement } from '@/lib/mouvements'
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
}

type Evenements = { readonly events?: Resolu<readonly Mouvement[]> }

type Strategy = { pocket: string; targetBps: number; actualBps: number | null }

function pourcentage(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

function pochesDepuisStrategies(strategies: readonly Strategy[] | null | undefined): PocheAllocation[] {
  if (strategies === null || strategies === undefined) return []
  return strategies.map((s) => ({
    poche: s.pocket,
    cible: s.targetBps / 100,
    reel: s.actualBps === null ? null : s.actualBps / 100,
  }))
}

function barresDepuisMouvements(mouvements: readonly Mouvement[] | null | undefined) {
  const repartition = new Map<string, number>()
  if (!mouvements) return [] as { nom: string; valeur: number }[]
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const deja = repartition.get(nom)
    repartition.set(nom, deja === undefined ? 1 : deja + 1)
  }
  return [...repartition.entries()].map(([nom, valeur]) => ({ nom, valeur }))
}

function barresDepuisStrategies(strategies: readonly Strategy[] | null | undefined) {
  if (!strategies) return []
  return strategies
    .filter((s) => s.actualBps !== null)
    .map((s) => ({
      nom: s.pocket,
      valeur: (s.actualBps as number) / 100,
    }))
}

function tonePerformance(bps: number | null | undefined): AdminKpiItem['tone'] {
  if (bps !== null && bps !== undefined && bps > 0) return 'success'
  return 'default'
}

function kpiSecondaires(input: {
  capacite: { availableCapacity: string; utilizationBps: number | null } | null | undefined
  perf: { navPerShare: string | null; totalReturnBps: number | null } | null | undefined
  serviceIndisponible: boolean
  dernierMouvement: Mouvement | undefined
}): AdminKpiItem[] {
  const { capacite, perf, serviceIndisponible, dernierMouvement } = input
  return [
    {
      id: 'capacite',
      label: 'Capacité disponible',
      value: montantUsdc(capacite?.availableCapacity, 0),
      hint: 'Portfolio aggregate',
    },
    {
      id: 'utilisation',
      label: 'Taux d’utilisation',
      value: pourcentage(capacite?.utilizationBps),
      hint: 'of design capacity',
    },
    {
      id: 'nav',
      label: 'Valeur de part',
      value: perf?.navPerShare ?? null,
      hint: 'navPerShare',
    },
    {
      id: 'performance',
      label: 'Performance',
      value: pourcentage(perf?.totalReturnBps),
      hint: 'Revenue-weighted',
      tone: tonePerformance(perf?.totalReturnBps),
    },
    {
      id: 'service',
      label: 'Service',
      value: serviceIndisponible ? 'Indisponible' : 'Disponible',
      tone: serviceIndisponible ? 'danger' : 'success',
    },
    {
      id: 'mouvement',
      label: 'Dernier mouvement',
      value: dernierMouvement ? phraseMouvement(dernierMouvement.eventName) : null,
      hint: dernierMouvement?.occurredAt ? ilYA(dernierMouvement.occurredAt) : undefined,
      tone: 'default',
    },
  ]
}

function descriptionActivite(dernier: Mouvement | undefined): string {
  if (!dernier) return 'Mouvements indexés Series 1'
  const quand = dernier.occurredAt ? ilYA(dernier.occurredAt) : '—'
  return `${phraseMouvement(dernier.eventName)} · ${quand}`
}

function cellType(m: Mouvement) {
  return <span className="text-zinc-950 dark:text-white">{phraseMouvement(m.eventName)}</span>
}

function cellMontant(m: Mouvement) {
  return (
    <span className="font-semibold text-accent-600 tabular-nums dark:text-accent-400">
      {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic, 2) : '—'}
    </span>
  )
}

function cellDate(m: Mouvement) {
  return <span className="text-zinc-500 dark:text-zinc-400">{ilYA(m.occurredAt)}</span>
}

const COLONNES_MOUVEMENTS: readonly AdminTableColumn<Mouvement>[] = [
  { key: 'type', header: 'Type', cell: cellType },
  { key: 'montant', header: 'Montant', cell: cellMontant },
  { key: 'date', header: 'Date', cell: cellDate },
]

function ActiviteRecente({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] | null | undefined }>) {
  const dernier = mouvements?.[0]
  const vide = mouvements === null || mouvements === undefined || mouvements.length === 0

  return (
    <AdminSection title="Activité récente" description={descriptionActivite(dernier)}>
      {vide ? (
        <CalmState message="Aucun mouvement relevé récemment." />
      ) : (
        <AdminSurface>
          <AdminTable rows={mouvements} keyFn={(m) => m.id} columns={COLONNES_MOUVEMENTS} />
          <div className="border-t border-zinc-950/5 px-5 py-3 dark:border-white/5 sm:px-6">
            <Link href="/admin/operations" className="text-sm text-accent-600 hover:underline dark:text-accent-400">
              Registre complet →
            </Link>
          </div>
        </AdminSurface>
      )}
    </AdminSection>
  )
}

export default async function Page() {
  const [dashboard, evenements, disponibilite] = await Promise.all([
    callBackend<Dashboard>('dashboard'),
    callBackend<Evenements>('series1-events', { params: { limit: 10 } }),
    callBackend<{ ready?: boolean }>('ready'),
  ])

  const serviceIndisponible = !disponibilite.ok || disponibilite.data.ready !== true
  const d = dashboard.ok ? dashboard.data : null

  const capacite = d?.capacity?.value
  const perf = d?.performance?.value
  const strategies = d?.strategies?.value
  const mouvements = evenements.ok ? evenements.data.events?.value : null
  const dernierMouvement = mouvements?.[0]

  const poches = pochesDepuisStrategies(strategies)
  const barresMouvements = barresDepuisMouvements(mouvements)
  const repartitionStrategies = barresDepuisStrategies(strategies)
  const nombreMouvements = mouvements?.length

  const metaSnapshot = dernierMouvement?.occurredAt
    ? `Series 1 · snapshot ${ilYA(dernierMouvement.occurredAt)}`
    : 'Series 1 · snapshot live'

  return (
    <>
      <PageHeader title="Hearst Connect — Portefeuille Series 1" meta={metaSnapshot} />

      {serviceIndisponible ? (
        <ExceptionBanner
          message="Le service ne répond pas ou n’est pas prêt."
          href="/admin/runtime"
          actionLabel="État du service"
        />
      ) : null}

      <AdminKpiSurface
        hero={{
          id: 'encours',
          label: 'Encours du portefeuille',
          value: montantUsdc(capacite?.totalAssets, 0),
          hint: 'Encours total du fonds Series 1',
          tone: 'accent',
        }}
        items={kpiSecondaires({ capacite, perf, serviceIndisponible, dernierMouvement })}
      />

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          {poches.length > 0 ? (
            <CockpitFigure
              title="Allocation cible vs réelle"
              description="Pourcentage du portefeuille par poche — visée contractuelle et constatée on-chain."
            >
              <AllocationChart poches={poches} />
            </CockpitFigure>
          ) : (
            <AdminChart
              question="Allocation cible vs réelle"
              unite="% du portefeuille"
              provenance="dashboard"
              etat={{ type: 'vide', explication: 'Aucune poche stratégique lisible.' }}
            />
          )}
        </div>
        <div className="lg:col-span-1">
          <CockpitFigure title="Mix capacité" description="Encours vs capacité disponible · plafond TVL">
            <UtilizationChart
              tvlCap={capacite?.tvlCap}
              totalAssets={capacite?.totalAssets}
              availableCapacity={capacite?.availableCapacity}
              utilizationBps={capacite?.utilizationBps}
            />
          </CockpitFigure>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {barresMouvements.length > 0 ? (
          <CockpitFigure
            title="Distribution des mouvements"
            description={
              nombreMouvements !== undefined
                ? `${nombreMouvements} derniers événements indexés`
                : 'Événements récents'
            }
            chartHeight="h-[240px]"
          >
            <DistributionBarChart barres={barresMouvements} />
          </CockpitFigure>
        ) : null}

        {repartitionStrategies.length > 0 ? (
          <CockpitFigure
            title="Répartition des stratégies"
            description="Part constatée (actualBps) par poche"
            chartHeight="h-[240px]"
          >
            <DistributionBarChart barres={repartitionStrategies} unit=" %" />
          </CockpitFigure>
        ) : null}
      </div>

      <ActiviteRecente mouvements={mouvements} />
    </>
  )
}
