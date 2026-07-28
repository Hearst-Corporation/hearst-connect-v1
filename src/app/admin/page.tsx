import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { AdminKpiSurface, type AdminKpiItem } from '@/components/admin/admin-kpi-surface'
import { CockpitFigure } from '@/components/admin/cockpit-figure'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { ExceptionBanner, CalmState } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { PocketProgress, PocketProgressLegend } from '@/components/admin/pocket-progress'
import { ShortcutRow } from '@/components/admin/shortcut-row'
import { Panel, PanelHeading, surfaceRaised } from '@/components/admin/surface'
import { UtilizationChart } from '@/components/admin/utilization-chart'
import { callBackend } from '@/lib/backend/client'
import { ilYA, montantUsdc, phraseMouvement } from '@/lib/mouvements'
import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ServerStackIcon,
} from '@heroicons/react/20/solid'
import type { Metadata } from 'next'
import Link from 'next/link'
import clsx from 'clsx'

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

function tonePerformance(bps: number | null | undefined): AdminKpiItem['tone'] {
  if (bps !== null && bps !== undefined && bps > 0) return 'success'
  return 'default'
}

function kpiSecondaires(input: {
  capacite: { availableCapacity: string; utilizationBps: number | null; tvlCap: string } | null | undefined
  perf: { navPerShare: string | null; totalReturnBps: number | null } | null | undefined
  serviceIndisponible: boolean
  dernierMouvement: Mouvement | undefined
  nombrePoches: number
}): AdminKpiItem[] {
  const { capacite, perf, serviceIndisponible, dernierMouvement, nombrePoches } = input
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
      id: 'plafond',
      label: 'Plafond TVL',
      value: montantUsdc(capacite?.tvlCap, 0),
      hint: 'Contractual cap',
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
      label: serviceIndisponible ? 'Service' : 'Poches',
      value: serviceIndisponible ? 'Indisponible' : String(nombrePoches),
      hint: serviceIndisponible
        ? 'État runtime'
        : dernierMouvement?.occurredAt
          ? `Dernier mvt · ${ilYA(dernierMouvement.occurredAt)}`
          : 'Stratégies lisibles',
      tone: serviceIndisponible ? 'danger' : 'default',
    },
  ]
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
  const videMouvements = mouvements === null || mouvements === undefined || mouvements.length === 0

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

      <CockpitSection>
        <AdminKpiSurface
          hero={{
            id: 'encours',
            label: 'Encours du portefeuille',
            value: montantUsdc(capacite?.totalAssets, 0),
            hint: 'When the fund’s on-chain assets are measured',
            tone: 'accent',
          }}
          items={kpiSecondaires({
            capacite,
            perf,
            serviceIndisponible,
            dernierMouvement,
            nombrePoches: poches.length,
          })}
        />

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {poches.length > 0 ? (
              <CockpitFigure
                title="Allocation cible vs réelle"
                description="Cumulative target versus on-chain allocation, by strategy pocket."
              >
                <AllocationChart poches={poches} />
              </CockpitFigure>
            ) : (
              <CockpitFigure
                title="Allocation cible vs réelle"
                description="Aucune poche stratégique lisible dans le dashboard."
              >
                <CalmState message="Les stratégies s’afficheront dès que le service les renverra." />
              </CockpitFigure>
            )}
          </div>
          <div className="lg:col-span-1">
            <CockpitFigure
              title="Mix capacité"
              action={
                <Link
                  href="/admin/vault"
                  className="text-xs font-medium text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-accent-300"
                >
                  Vault →
                </Link>
              }
            >
              <UtilizationChart
                tvlCap={capacite?.tvlCap}
                totalAssets={capacite?.totalAssets}
                availableCapacity={capacite?.availableCapacity}
                utilizationBps={capacite?.utilizationBps}
              />
            </CockpitFigure>
          </div>
        </div>

        {poches.length > 0 ? (
          <div className={clsx(surfaceRaised, 'mt-5 overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/5 px-5 py-3 dark:border-white/5">
              <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
                Poches
              </h2>
              <PocketProgressLegend />
            </div>
            <ul>
              {poches.map((p, i) => (
                <li key={p.poche}>
                  <Link
                    href="/admin/vault"
                    className={clsx(
                      'flex flex-col gap-3 border-b border-zinc-950/5 px-5 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-6 dark:border-white/5',
                      i === 0
                        ? 'bg-accent-500/5'
                        : 'hover:bg-zinc-950/[0.02] dark:hover:bg-white/[0.02]',
                    )}
                  >
                    <div className="w-full min-w-0 sm:w-52">
                      <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">{p.poche}</p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">Stratégie Series 1</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <PocketProgress name={p.poche} cible={p.cible} reel={p.reel} showName={false} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ShortcutRow
            href="/admin/operations"
            title="Registre des opérations"
            status="Mouvements on-chain"
            icon={ArrowsRightLeftIcon}
          />
          <ShortcutRow
            href="/admin/runtime"
            title="État du service"
            status={serviceIndisponible ? 'Indisponible' : 'Sondes runtime'}
            icon={ServerStackIcon}
          />
          <ShortcutRow href="/admin/vault" title="Vault" status="Stratégies et rééquilibrage" icon={CircleStackIcon} />
          <ShortcutRow
            href="/admin/administration"
            title="Administration"
            status="Équipe, traces, réglages"
            icon={Cog6ToothIcon}
          />
        </div>
      </CockpitSection>

      <CockpitSection
        index="02"
        title="Activité récente"
        description={
          dernierMouvement
            ? `${phraseMouvement(dernierMouvement.eventName)} · ${dernierMouvement.occurredAt ? ilYA(dernierMouvement.occurredAt) : '—'}`
            : 'Mouvements indexés Series 1'
        }
        actions={
          <Link href="/admin/operations" className="text-xs font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400">
            Registre →
          </Link>
        }
      >
        {videMouvements ? (
          <CalmState message="Aucun mouvement relevé récemment." />
        ) : (
          <Panel inset="none" className="overflow-hidden">
            <PanelHeading title="Mouvements" />
            <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
              {mouvements!.slice(0, 8).map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                      {phraseMouvement(m.eventName)}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{ilYA(m.occurredAt)}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-accent-600 dark:text-accent-400">
                    {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic, 2) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </CockpitSection>
    </>
  )
}
