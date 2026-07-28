import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { AdminKpiSurface, type AdminKpiItem } from '@/components/admin/admin-kpi-surface'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { AccueilAlertes, type AlerteBackend } from '@/components/admin/charts/accueil-alertes'
import {
  AccueilDeriveChart,
  SEUIL_DERIVE_ATTENTION_BPS,
  SEUIL_DERIVE_CRITIQUE_BPS,
  type PocheDerive,
} from '@/components/admin/charts/accueil-derive-chart'
import { AccueilVueEnsemble, type VerdictAccueil } from '@/components/admin/charts/accueil-vue-ensemble'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { ExceptionBanner, CalmState } from '@/components/admin/cockpit'
import { DistributionBarChart, type BarreRepartition } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { PocketProgress, PocketProgressLegend } from '@/components/admin/pocket-progress'
import { ShortcutRow } from '@/components/admin/shortcut-row'
import { Panel, PanelHeading, surfaceRaised } from '@/components/admin/surface'
import { callBackend } from '@/lib/backend/client'
import { formatNumber, formatPercent } from '@/lib/format'
import { ilYA, libelleMouvement, montantUsdc, phraseMouvement } from '@/lib/mouvements'
import { etatSerieDe } from '@/lib/serie-etat'
import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ServerStackIcon,
} from '@heroicons/react/20/solid'
import type { Metadata } from 'next'
import Link from 'next/link'
import clsx from 'clsx'

/**
 * Home — the command post.
 *
 * The screen answers a single question, in this order: "is everything fine,
 * or not?", then "where do things stand?", then "what happened?".
 *
 * Hence the composition:
 *   1. exceptions and ALERTS first — the service emits them, they cannot
 *      stay below the fold;
 *   2. the overview: assets under management, cap utilization, and three
 *      operational verdicts (drift, electricity coverage, availability);
 *   3. the detailed measures, then the charts that explain them;
 *   4. recent activity, and only at the end the shortcuts.
 *
 * Two deliberate departures from the previous version:
 *
 * — Charts move from `CockpitFigure` to `ChartFrame`. A frame that declares
 *   the unit, the source, and the STATE of the series beats a mute figure:
 *   when the source is missing, the frame stays in place and says why,
 *   instead of disappearing or plotting a zero.
 *
 * — The "Capacity mix" donut gives way to the overview's cap bar. Both
 *   represented the same number; the freed slot now serves allocation
 *   DRIFT, which wasn't shown anywhere even though it's the only
 *   actionable measure in the block.
 *
 * The reading thresholds (drift, electricity coverage) are conventions of
 * this console: the contract exposes no tolerance. They are announced as
 * such on screen, never presented as a product rule.
 */

export const metadata: Metadata = { title: 'Home' }
export const dynamic = 'force-dynamic'

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Pocket = {
  readonly pocket: string
  readonly label?: string | null
  readonly targetBps: number
  readonly actualBps: number | null
  readonly driftBps?: number | null
}

type Dashboard = {
  readonly capacity?: Resolved<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
  readonly performance?: Resolved<{ navPerShare: string | null; totalReturnBps: number | null }>
  readonly strategies?: Resolved<readonly Pocket[]>
  readonly allocation?: Resolved<{ pockets: readonly Pocket[]; targetTotalBps?: number | null }>
  readonly alerts?: Resolved<readonly AlerteBackend[]>
  readonly rebalancing?: Resolved<{
    lastRebalanceAt: string | null
    driftBps: number | null
    pending: unknown
  }>
  readonly reserve?: Resolved<{
    reserveUsdc: string | null
    reserveBps: number | null
    electricityCoveredMonths: number | null
  }>
  readonly subscription?: Resolved<{
    subscriptionOpen: boolean | null
    minimumDepositAtomic: string | null
    whitelistRequired: boolean | null
  }>
}

type Movement = {
  readonly id: string
  readonly eventName: string
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type EventsResponse = { readonly events?: Resolved<readonly Movement[]> }

/* ── Formatting ──────────────────────────────────────────────────────────── */

/** A drift is expressed in POINTS, with its sign: "+2.15 pt" is deliberate. */
function formatDriftPoints(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  const value = bps / 100
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatNumber(value, { maximumFractionDigits: 2 })} pt`
}

/* ── Pockets ─────────────────────────────────────────────────────────────── */

/**
 * `allocation.pockets` carries the label and the drift already computed by
 * the service; `strategies` carries only target and actual. We read the
 * former when it answers, and fall back to the latter without inventing
 * anything.
 */
function readPockets(d: Dashboard | null): readonly Pocket[] {
  const fromAllocation = d?.allocation?.value?.pockets
  if (fromAllocation !== undefined && fromAllocation !== null && fromAllocation.length > 0) return fromAllocation
  const fromStrategies = d?.strategies?.value
  if (fromStrategies !== undefined && fromStrategies !== null) return fromStrategies
  return []
}

function pocketLabel(p: Pocket): string {
  return typeof p.label === 'string' && p.label !== '' ? p.label : p.pocket
}

function allocationBars(pockets: readonly Pocket[]): PocheAllocation[] {
  return pockets.map((p) => ({
    poche: p.pocket,
    cible: p.targetBps / 100,
    reel: p.actualBps === null ? null : p.actualBps / 100,
  }))
}

/**
 * Drift comes from the service when it provides it. Otherwise, it's derived
 * from the actual/target pair — a subtraction, not an invention. A pocket
 * whose actual value isn't readable is EXCLUDED: a zero drift would read as
 * "aligned".
 */
function driftBars(pockets: readonly Pocket[]): PocheDerive[] {
  const read: PocheDerive[] = []
  for (const p of pockets) {
    const provided = p.driftBps
    if (typeof provided === 'number' && Number.isFinite(provided)) {
      read.push({ poche: p.pocket, libelle: pocketLabel(p), deriveBps: provided })
      continue
    }
    if (p.actualBps !== null && Number.isFinite(p.actualBps)) {
      read.push({ poche: p.pocket, libelle: pocketLabel(p), deriveBps: p.actualBps - p.targetBps })
    }
  }
  return read
}

/* ── Verdicts ────────────────────────────────────────────────────────────── */

function driftVerdict(
  rebalancing: Dashboard['rebalancing'],
  worstPocketBps: number | null,
): VerdictAccueil {
  const block = rebalancing?.value
  const overall = block?.driftBps
  const measure = typeof overall === 'number' && Number.isFinite(overall) ? overall : worstPocketBps
  const last = block?.lastRebalanceAt
  const detail =
    typeof last === 'string' && last !== ''
      ? `Last rebalance ${ilYA(last)}`
      : 'No rebalance timestamped yet'

  if (measure === null || !Number.isFinite(measure)) {
    return {
      id: 'drift',
      libelle: 'Allocation drift',
      valeur: '—',
      mot: 'Not measured',
      ton: 'neutre',
      detail: 'The service does not return a rebalancing gap',
    }
  }

  const magnitude = Math.abs(measure)
  let mot = 'Aligned'
  let ton: VerdictAccueil['ton'] = 'sain'
  if (magnitude >= SEUIL_DERIVE_CRITIQUE_BPS) {
    mot = 'Action required'
    ton = 'critique'
  } else if (magnitude >= SEUIL_DERIVE_ATTENTION_BPS) {
    mot = 'Watch closely'
    ton = 'attention'
  }

  return { id: 'drift', libelle: 'Allocation drift', valeur: formatDriftPoints(measure), mot, ton, detail }
}

/**
 * The reserve covers the farm's electricity for N months. It's the
 * operational survival measure of the product: below six months, the
 * subject is no longer financial, it's industrial. The threshold is a
 * convention of this console, announced in the displayed detail.
 */
const ELECTRICITY_COMFORTABLE_MONTHS = 12
const ELECTRICITY_CRITICAL_MONTHS = 6

function electricityVerdict(reserve: Dashboard['reserve']): VerdictAccueil {
  const months = reserve?.value?.electricityCoveredMonths
  if (typeof months !== 'number' || !Number.isFinite(months)) {
    return {
      id: 'electricity',
      libelle: 'Electricity covered',
      valeur: '—',
      mot: 'Not measured',
      ton: 'neutre',
      detail: 'The service does not return coverage',
    }
  }

  let mot = 'Comfortable coverage'
  let ton: VerdictAccueil['ton'] = 'sain'
  if (months < ELECTRICITY_CRITICAL_MONTHS) {
    mot = 'Action required'
    ton = 'critique'
  } else if (months < ELECTRICITY_COMFORTABLE_MONTHS) {
    mot = 'Watch closely'
    ton = 'attention'
  }

  return {
    id: 'electricity',
    libelle: 'Electricity covered',
    valeur: `${formatNumber(months)} months`,
    mot,
    ton,
    detail: `Reserve ${montantUsdc(reserve?.value?.reserveUsdc, 0)} · reading threshold ${ELECTRICITY_COMFORTABLE_MONTHS} months`,
  }
}

function serviceVerdict(unavailable: boolean, lastMovement: Movement | undefined): VerdictAccueil {
  if (unavailable) {
    return {
      id: 'service',
      libelle: 'Service availability',
      valeur: 'Unavailable',
      mot: 'Action required',
      ton: 'critique',
      detail: 'The availability probe is not responding',
    }
  }
  const timestamp = lastMovement?.occurredAt
  return {
    id: 'service',
    libelle: 'Service availability',
    valeur: 'Operational',
    mot: 'Nothing to report',
    ton: 'sain',
    detail:
      typeof timestamp === 'string' && timestamp !== ''
        ? `Last movement indexed ${ilYA(timestamp)}`
        : 'No movement indexed recently',
  }
}

/* ── Secondary measures ──────────────────────────────────────────────────── */

function performanceTone(bps: number | null | undefined): AdminKpiItem['tone'] {
  if (bps !== null && bps !== undefined && bps > 0) return 'success'
  return 'default'
}

function kpiItems(input: {
  d: Dashboard | null
  pocketCount: number
  lastMovement: Movement | undefined
}): AdminKpiItem[] {
  const { d, pocketCount, lastMovement } = input
  const capacity = d?.capacity?.value
  const perf = d?.performance?.value
  const subscription = d?.subscription?.value

  return [
    {
      id: 'capacity',
      label: 'Available capacity',
      value: montantUsdc(capacity?.availableCapacity, 0),
      hint: 'Remaining subscribable',
    },
    { id: 'cap', label: 'TVL cap', value: montantUsdc(capacity?.tvlCap, 0), hint: 'Contractual cap' },
    { id: 'nav', label: 'Share value', value: perf?.navPerShare ?? null, hint: 'navPerShare, in USDC' },
    {
      id: 'performance',
      label: 'Performance',
      value: formatPercent(perf?.totalReturnBps, { fromBps: true, maximumFractionDigits: 2 }),
      hint: 'Total return since inception',
      tone: performanceTone(perf?.totalReturnBps),
    },
    {
      id: 'utilization',
      label: 'Utilization rate',
      value: formatPercent(capacity?.utilizationBps, { fromBps: true, maximumFractionDigits: 2 }),
      hint: 'Share of the cap committed',
    },
    {
      id: 'pockets',
      label: 'Strategic pockets',
      value: pocketCount > 0 ? String(pocketCount) : null,
      hint: 'Strategies readable on-chain',
    },
    {
      id: 'subscription',
      label: 'Subscription',
      value: subscriptionLabel(subscription?.subscriptionOpen),
      hint:
        subscription?.whitelistRequired === true ? 'Whitelist required' : 'Minimum ticket opposite',
    },
    {
      id: 'ticket',
      label: 'Minimum ticket',
      value: montantUsdc(subscription?.minimumDepositAtomic, 0),
      hint: lastMovement?.occurredAt ? `Last mvt · ${ilYA(lastMovement.occurredAt)}` : 'Initial deposit',
    },
  ]
}

function subscriptionLabel(open: boolean | null | undefined): string | null {
  if (open === true) return 'Open'
  if (open === false) return 'Closed'
  return null
}

/* ── Movement distribution ──────────────────────────────────────────────── */

/**
 * Real count of indexed event types — no category is added "to look nice":
 * a type absent from the feed is absent from the chart.
 */
function distributionByType(movements: readonly Movement[]): BarreRepartition[] {
  const counts = new Map<string, number>()
  for (const m of movements) {
    const seen = counts.get(m.eventName)
    counts.set(m.eventName, seen === undefined ? 1 : seen + 1)
  }
  return [...counts.entries()].map(([name, value]) => ({ nom: libelleMouvement(name), valeur: value }))
}

/* ── Frame states ────────────────────────────────────────────────────────── */

/**
 * A LIVE but empty series is not a plotted series: the frame must say "no
 * data for the period" instead of displaying a bare chart.
 */
function seriesState(block: Resolved<unknown> | undefined, length: number, fallback: string, empty: string): EtatSerie {
  const state = etatSerieDe(block, fallback)
  if (state.type === 'tracee' && length === 0) return { type: 'vide', explication: empty }
  return state
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [dashboard, events, availability] = await Promise.all([
    callBackend<Dashboard>('dashboard'),
    callBackend<EventsResponse>('series1-events', { params: { limit: 12 } }),
    callBackend<{ ready?: boolean }>('ready'),
  ])

  const serviceUnavailable = !availability.ok || availability.data.ready !== true
  const d = dashboard.ok ? dashboard.data : null
  const capacity = d?.capacity?.value
  const movements = events.ok ? events.data.events?.value : null
  const movementList = movements === null || movements === undefined ? [] : movements
  const lastMovement = movementList[0]

  const pockets = readPockets(d)
  const allocationBarData = allocationBars(pockets)
  const driftBarData = driftBars(pockets)
  const distribution = distributionByType(movementList)

  // The overall verdict keeps the most-drifted pocket, not the average: an
  // average offsets an over-allocated pocket against an under-allocated one
  // and would read "aligned" on a portfolio that isn't.
  const worstPocketBps =
    driftBarData.length > 0
      ? driftBarData.reduce((worst, p) => (Math.abs(p.deriveBps) > Math.abs(worst) ? p.deriveBps : worst), 0)
      : null

  const alerts = d?.alerts?.value
  const alertList = alerts === null || alerts === undefined ? [] : alerts

  const verdicts: VerdictAccueil[] = [
    driftVerdict(d?.rebalancing, worstPocketBps),
    electricityVerdict(d?.reserve),
    serviceVerdict(serviceUnavailable, lastMovement),
  ]

  const metaSnapshot = lastMovement?.occurredAt
    ? `Series 1 · snapshot ${ilYA(lastMovement.occurredAt)}`
    : 'Series 1 · snapshot live'

  return (
    <AdminPage>
      <PageHeader title="Hearst Connect — Series 1 Portfolio" description={metaSnapshot} />

      {serviceUnavailable ? (
        <ExceptionBanner
          message="The service is not responding or is not ready."
          href="/admin/runtime"
          actionLabel="Service status"
        />
      ) : null}

      <AdminSection>
        <AccueilVueEnsemble
          encours={montantUsdc(capacity?.totalAssets, 0)}
          encoursLegende="On-chain assets, denominated in USDC"
          utiliseBps={capacity?.utilizationBps ?? null}
          disponible={montantUsdc(capacity?.availableCapacity, 0)}
          plafond={montantUsdc(capacity?.tvlCap, 0)}
          verdicts={verdicts}
        />

        {/* Alerts come before the measures: a console that makes you read
            eight numbers before flagging an incident has its priorities
            backwards. */}
        <AccueilAlertes alertes={alertList} />

        <AdminKpiSurface items={kpiItems({ d, pocketCount: pockets.length, lastMovement })} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartFrame
              question="Is the money allocated where it should be?"
              unite="Share of portfolio, in %"
              etat={seriesState(
                d?.allocation ?? d?.strategies,
                allocationBarData.length,
                'strategic pockets are not yet readable',
                'the service returns an allocation with no pockets',
              )}
            >
              <AllocationChart poches={allocationBarData} />
            </ChartFrame>
          </div>
          <div className="lg:col-span-1">
            <ChartFrame
              question="Which pocket has drifted from its target?"
              unite="Signed gap, in points"
              etat={seriesState(
                d?.allocation ?? d?.strategies,
                driftBarData.length,
                'the service does not return an allocation gap',
                'no pocket exposes a readable gap',
              )}
            >
              <AccueilDeriveChart poches={driftBarData} />
            </ChartFrame>
          </div>
        </div>

        {pockets.length > 0 ? (
          <div className={clsx(surfaceRaised, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/5 px-5 py-3 dark:border-white/5">
              <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
                Pockets
              </h2>
              <PocketProgressLegend />
            </div>
            <ul>
              {pockets.map((p, i) => (
                <li key={p.pocket}>
                  <Link
                    href="/admin/vault"
                    className={clsx(
                      'flex flex-col gap-3 border-b border-zinc-950/5 px-5 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-6 dark:border-white/5',
                      i === 0 ? 'bg-accent-500/5' : 'hover:bg-zinc-950/[0.02] dark:hover:bg-white/[0.02]',
                    )}
                  >
                    <div className="w-full min-w-0 sm:w-52">
                      <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                        {pocketLabel(p)}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        Pocket {p.pocket} · drift {formatDriftPoints(p.driftBps)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <PocketProgress
                        name={p.pocket}
                        cible={p.targetBps / 100}
                        reel={p.actualBps === null ? null : p.actualBps / 100}
                        showName={false}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </AdminSection>

      <AdminSection
        index="02"
        title="Recent activity"
        description={
          lastMovement
            ? `${phraseMouvement(lastMovement.eventName)} · ${lastMovement.occurredAt ? ilYA(lastMovement.occurredAt) : '—'}`
            : 'Series 1 indexed movements'
        }
        actions={
          <Link
            href="/admin/operations"
            className="text-xs font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400"
          >
            Log →
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ChartFrame
              question="What does recent activity consist of?"
              unite="Number of indexed events"
              etat={seriesState(
                events.ok ? events.data.events : undefined,
                distribution.length,
                'movements are not yet indexed',
                'no movement recorded for the period',
              )}
            >
              <DistributionBarChart barres={distribution} />
            </ChartFrame>
          </div>

          <div className="lg:col-span-3">
            {movementList.length === 0 ? (
              <CalmState message="No movement recorded recently." />
            ) : (
              <Panel inset="none" className="overflow-hidden">
                <PanelHeading title="Movements" />
                <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                  {movementList.slice(0, 8).map((m) => (
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
          </div>
        </div>
      </AdminSection>

      {/* Shortcuts close the page: you navigate AFTER reading the state, not
          before. They're no longer the main content of Home. */}
      <nav aria-label="Quick access" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ShortcutRow
          href="/admin/operations"
          title="Operations log"
          status="On-chain movements"
          icon={ArrowsRightLeftIcon}
        />
        <ShortcutRow
          href="/admin/runtime"
          title="Service status"
          status={serviceUnavailable ? 'Unavailable' : 'Runtime probes'}
          icon={ServerStackIcon}
        />
        <ShortcutRow href="/admin/vault" title="Vault" status="Strategies and rebalancing" icon={CircleStackIcon} />
        <ShortcutRow
          href="/admin/administration"
          title="Administration"
          status="Team, audit trail, settings"
          icon={Cog6ToothIcon}
        />
      </nav>
    </AdminPage>
  )
}
