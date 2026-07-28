import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { CapacityBar } from '@/components/admin/capacity-bar'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { AccueilAlertes, type AlerteBackend } from '@/components/admin/charts/accueil-alertes'
import {
  AccueilDeriveChart,
  SEUIL_DERIVE_ATTENTION_BPS,
  SEUIL_DERIVE_CRITIQUE_BPS,
  type PocheDerive,
} from '@/components/admin/charts/accueil-derive-chart'
import type { VerdictAccueil } from '@/components/admin/charts/accueil-vue-ensemble'
import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import { AdminMetric, AdminSection } from '@/components/admin/surfaces'
import { AdminLabel, AdminPage } from '@/components/admin/typography'
import { Card, CardHeader, ExceptionBanner, CalmState, HeroFigure } from '@/components/admin/cockpit'
import { DistributionBarChart, type BarreRepartition } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { PocketProgress, PocketProgressLegend } from '@/components/admin/pocket-progress'
import { callBackend } from '@/lib/backend/client'
import { formatNumber, formatPercent } from '@/lib/format'
import { sectionContentGap } from '@/lib/layout-tokens'
import { ilYA, libelleMouvement, montantUsdc, phraseMouvement } from '@/lib/mouvements'
import { etatSerieDe } from '@/lib/serie-etat'
import type { Metadata } from 'next'
import Link from 'next/link'
import clsx from 'clsx'

/**
 * Home — the command post.
 *
 * The screen answers a single question, in this order: "is anything wrong?",
 * then "where do we stand?", then "what happened?".
 *
 * Composition, on the 12-column application grid:
 *   1. exceptions and ALERTS first — the service emits them, they cannot
 *      stay below the fold;
 *   2. the overview — the primary metric (portfolio assets, and the share of
 *      the cap they consume) on six columns, the three operational verdicts
 *      on the other six, then the supporting measures as balanced tiles;
 *   3. allocation — where the money sits against target on eight columns,
 *      which pocket has drifted on the remaining four, then the pocket list;
 *   4. recent activity — the shape of the feed beside the feed itself.
 *
 * What the visual review changed here, and why:
 *
 * — The supporting measures were a single slab of hairline-gutter cells.
 *   Eight cells sharing one background read as a spreadsheet, not as eight
 *   measures. They are tiles in `AdminMetricGrid` now, and the real child
 *   count is passed so the last row is never left half empty.
 *
 * — The overview was one full-width surface nesting a hero, a cap bar and
 *   three verdicts in internal grids — a card holding cards. It is now two
 *   declared columns of the page grid: nothing stretches to "whatever is
 *   left", and no surface sits inside another surface.
 *
 * — Recent activity was a 2/3 split in which the chart card stretched to the
 *   movement list's height and left a large empty region under the bars. The
 *   row is balanced (6/6) and aligned to the top, so each card ends where its
 *   content ends.
 *
 * — The four shortcut links that closed the page are gone. The sidebar now
 *   carries five destinations and Administration owns the secondary ones;
 *   four more links at the bottom of Home was a second navigation competing
 *   with the first.
 *
 * — Charts go through `ChartFrame`. A frame that declares the unit, the
 *   source and the STATE of the series beats a mute figure: when the source
 *   is missing, the frame stays in place and says why, instead of
 *   disappearing or plotting a zero.
 *
 * The reading thresholds (drift, electricity coverage) are conventions of
 * this console: the contract exposes no tolerance. They are announced as
 * such on screen, never presented as a product rule.
 */

// Next.js does not apply a layout's title.template to a page sharing the
// same route segment as that layout (only to nested descendants) — so the
// admin index route composes the title explicitly rather than relying on
// admin/layout.tsx's template.
export const metadata: Metadata = { title: { absolute: 'Home · Hearst Connect Administration' } }
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

/**
 * A verdict's tone colors the WORD, never replaces it.
 *
 * These are the only semantic colors on this page, and they are spent on the
 * one thing that genuinely carries a state: an operational verdict. Ordinary
 * measures and ordinary series stay mint and neutral — if "watch closely"
 * amber were also the color of a routine pocket, it would stop meaning
 * anything the day a pocket really slips.
 */
const VERDICT_TONE: Record<VerdictAccueil['ton'], string> = {
  neutre: 'text-zinc-500 dark:text-zinc-400',
  sain: 'text-success-600 dark:text-success-400',
  attention: 'text-warning-600 dark:text-warning-400',
  critique: 'text-danger-600 dark:text-danger-400',
}

function VerdictRow({ verdict }: Readonly<{ verdict: VerdictAccueil }>) {
  return (
    // Deliberately `flex-nowrap`: allowed to wrap, the value and its word
    // dropped onto a second line and landed under the detail instead of
    // beside the label — the row stopped reading as "subject / answer". The
    // detail truncates instead, which is the sentence that loses the least.
    <li className="flex items-baseline justify-between gap-x-4 px-5 py-3.5 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-zinc-700 dark:text-zinc-200">{verdict.libelle}</p>
        {verdict.detail ? (
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400" title={verdict.detail}>
            {verdict.detail}
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white">
          {verdict.valeur}
        </p>
        <span
          className={clsx(
            'mt-0.5 flex items-center justify-end gap-1.5 text-xs font-medium',
            VERDICT_TONE[verdict.ton],
          )}
        >
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {verdict.mot}
        </span>
      </div>
    </li>
  )
}

/* ── Supporting measures ─────────────────────────────────────────────────── */

type SupportingMeasure = {
  readonly id: string
  readonly label: string
  readonly value: string | null
  readonly hint: string
}

function supportingMeasures(input: {
  d: Dashboard | null
  pocketCount: number
  lastMovement: Movement | undefined
}): SupportingMeasure[] {
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
  const recentMovements = movementList.slice(0, 8)

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

  const measures = supportingMeasures({ d, pocketCount: pockets.length, lastMovement })

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

      {/* Alerts come before the measures: a console that makes you read eight
          numbers before flagging an incident has its priorities backwards. */}
      <AccueilAlertes alertes={alertList} />

      {/*
        Overview — the page's lede, and deliberately without a section
        heading: the H1 is two lines above, and a rule plus an "Overview" H2
        would be a second title for the same thing.
      */}
      <div className={sectionContentGap}>
        <AdminGrid>
          {/* The primary metric takes half the grid. Portfolio assets and the
              share of the cap they consume are one reading, not two, so they
              share one card — the figure, then what it leaves available. */}
          <AdminCol span={6} md={4}>
            <Card className="flex h-full flex-col p-6">
              {/* No unit passed to `HeroFigure`: `montantUsdc` already renders
                  the symbol, adding one would produce "$1,177,859 USDC". */}
              <HeroFigure valeur={montantUsdc(capacity?.totalAssets, 0)} libelle="Portfolio assets" />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                On-chain assets, denominated in USDC
              </p>
              <div className="mt-6 border-t border-zinc-950/5 pt-5 dark:border-console-line">
                <AdminLabel>Subscription cap consumed</AdminLabel>
                <div className="mt-3">
                  <CapacityBar
                    utiliseBps={capacity?.utilizationBps ?? null}
                    disponible={montantUsdc(capacity?.availableCapacity, 0)}
                    total={montantUsdc(capacity?.tvlCap, 0)}
                  />
                </div>
              </div>
            </Card>
          </AdminCol>

          {/* The three operational verdicts take the other half. One card,
              three rows — they used to be three cells of the same slab as the
              hero, where they read as more of the same measurement. */}
          <AdminCol span={6} md={4}>
            <Card className="h-full">
              <CardHeader title="Operational verdicts" hint="What needs a decision today, if anything" />
              <ul className="divide-y divide-zinc-950/5 pb-2 dark:divide-console-line-soft">
                {verdicts.map((v) => (
                  <VerdictRow key={v.id} verdict={v} />
                ))}
              </ul>
            </Card>
          </AdminCol>
        </AdminGrid>

        {/* Supporting measures. `count` is the real number of children, so the
            last row is full whatever the service returns. */}
        <AdminMetricGrid count={measures.length}>
          {measures.map((m) => (
            <AdminMetric key={m.id} label={m.label} value={m.value} hint={m.hint} />
          ))}
        </AdminMetricGrid>
      </div>

      <AdminSection
        index="01"
        title="Allocation"
        description="Where the money sits against its target, and which pocket has moved away from it."
      >
        {/* 8/4: the target-vs-actual reading is the subject and gets the wide
            column; the signed drift is the detail that explains it. */}
        <AdminGrid>
          <AdminCol span={8}>
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
          </AdminCol>
          <AdminCol span={4}>
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
          </AdminCol>
        </AdminGrid>

        {pockets.length > 0 ? (
          <Card className="overflow-hidden">
            {/* The legend rides in the header's action slot — it used to sit
                under a bordered strip inside this card, which was a frame
                inside a frame. No row is tinted: an accent on the first
                pocket claimed an importance the data never gave it. */}
            <CardHeader
              title="Pockets"
              hint="Target and actual allocation, pocket by pocket"
              action={<PocketProgressLegend />}
            />
            <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
              {pockets.map((p) => (
                <li key={p.pocket}>
                  <Link
                    href="/admin/vault"
                    className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-zinc-950/[0.02] sm:flex-row sm:items-center sm:gap-6 sm:px-6 dark:hover:bg-white/[0.02]"
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
          </Card>
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
        {/*
          Balanced 6/6, and `items-start`.

          The previous 2/3 split stretched the chart card to the movement
          list's height, leaving a large empty region under a handful of bars.
          A distribution over three or four event types and a list of eight
          movements have no reason to be the same height — so each card stops
          where its content stops, and the ragged edge between them is
          whitespace rather than an empty box.
        */}
        <AdminGrid className="items-start">
          <AdminCol span={6} md={4}>
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
          </AdminCol>

          <AdminCol span={6} md={4}>
            {recentMovements.length === 0 ? (
              <CalmState message="No movement recorded recently." />
            ) : (
              <Card className="overflow-hidden">
                <CardHeader title="Movements" hint="Most recent indexed events" />
                <ul className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                  {recentMovements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
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
              </Card>
            )}
          </AdminCol>
        </AdminGrid>
      </AdminSection>
    </AdminPage>
  )
}
