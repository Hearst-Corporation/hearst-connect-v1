import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { VendingCurveChart, type PointCourbe } from '@/components/admin/product-charts'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Product Sheet' }
export const dynamic = 'force-dynamic'

/**
 * Product Sheet — what a subscriber commits to.
 *
 * The old page dumped a route's raw response. A product sheet isn't a
 * technical object, though — it's a contract. Three questions summarize
 * it: how much must be deposited and for how long, how the reward rate
 * evolves over the months, and where the money is meant to be placed.
 *
 * ── Composition ───────────────────────────────────────────────────────────
 * Two sections, two rows, and no block that stretches to whatever is left.
 *
 *   Subscription terms   terms card (5 cols) · reward-rate frame (7 cols)
 *   Target allocation    allocation bars (6) · per-pocket detail (6)
 *
 * The rejected version stacked four full-width surfaces, so a page carrying
 * one amount, two facts and a handful of rows ran past two viewports. Pairing
 * each headline with its detail on the same row is what shortens it, not
 * shrinking anything.
 *
 * ── The flat-curve trap ─────────────────────────────────────────────────
 * The service does return five real milestones, but every rate on this
 * deployment is zero. Plotting that line would be a misleading read: it
 * would say "zero reward measured" when the truth is "not configured yet".
 * The `curveConfigured` flag makes the distinction, and the frame then
 * shows what's expected instead of a flat curve.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Pocket = {
  readonly pocket?: string | null
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
}

type Terms = {
  readonly productDurationMonths?: number | null
  readonly minimumDepositUsdc?: string | null
  readonly allocation?: { readonly pockets?: readonly Pocket[] | null } | null
}

type Factsheet = {
  readonly terms?: Resolved<Terms>
  readonly tvlCap?: Resolved<string | number>
  readonly vendingCurve?: Resolved<readonly { month: number; bps: number }[]>
}

const PAGE_REASONS = {
  ...MOTIF_SERIE,
  dynavault_not_deployed: 'these terms are not yet available on the deployed contract',
}

function stateOf(block: Resolved<unknown> | undefined, fallback: string): EtatSerie {
  return etatSerieDe(block, fallback, PAGE_REASONS)
}

/**
 * A duration of zero months isn't a duration: it's a term not yet set. The
 * product then closes on no milestone at all — that has to be said, rather
 * than displaying "0 months".
 */
function readableDuration(months: number | null | undefined): string {
  if (months === null || months === undefined || !Number.isFinite(months)) return '—'
  if (months <= 0) return 'No fixed term'
  return `${formatNumber(months)} months`
}

/**
 * A variance reads signed, and its color is a claim.
 *
 * The previous version painted every pocket within a point of its target in
 * success green and everything past five points in warning orange, which
 * turned an ordinary allocation table into a traffic light. Green and orange
 * are the only two colors this console has left to say "healthy" and "worth
 * watching"; spending them on a routine reading leaves nothing to say with
 * when a pocket is genuinely off. So an ordinary variance is neutral, and the
 * semantic tone appears only for a drift material enough to act on.
 */
const DRIFT_THRESHOLD_POINTS = 5

function readableVariance(target: number | null, actual: number | null): { text: string; tone: string } {
  if (target === null || actual === null) return { text: '—', tone: 'text-zinc-500' }
  const pts = (actual - target) / 100
  const tone = Math.abs(pts) >= DRIFT_THRESHOLD_POINTS ? 'text-warning-400' : 'text-zinc-300'
  return { text: `${formatNumber(pts, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`, tone }
}

function readableShare(bps: number | null | undefined): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
}

function curveState(points: readonly PointCourbe[], curveConfigured: boolean, vendingCurve: Resolved<unknown> | undefined): EtatSerie {
  if (points.length === 0) {
    return stateOf(vendingCurve, 'The reward terms have not been transmitted yet.')
  }
  if (curveConfigured) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'The product’s five milestones are defined, but no rate has been recorded for any of them yet. The curve will render as soon as they are.',
  }
}

export default async function Page() {
  const response = await callBackend<Factsheet>('product-factsheet')
  const f = response.ok ? response.data : null

  const terms = f?.terms?.value
  const cap = f?.tvlCap?.value

  // Target allocation by pocket. A pocket without a readable target is
  // dropped rather than rounded down to zero.
  const rawPockets = terms?.allocation?.pockets
  const pockets = rawPockets ?? []
  const readablePockets = pockets.filter((p) => p.targetBps !== null && p.targetBps !== undefined && Number.isFinite(p.targetBps))

  const allocation: PocheAllocation[] = readablePockets.map((p) => ({
    poche:
      p.label === null || p.label === undefined || p.label === ''
        ? (p.pocket ?? 'Unnamed pocket')
        : p.label,
    cible: Number(p.targetBps) / 100,
    reel:
      p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
        ? null
        : p.actualBps / 100,
  }))

  // Reward curve. Five real milestones, every rate at zero: the curve
  // isn't configured. Plotting a flat line would read as "zero reward
  // measured", which would be false.
  const rawCurve = f?.vendingCurve?.value
  const points: PointCourbe[] =
    rawCurve === null || rawCurve === undefined
      ? []
      : rawCurve.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const curveConfigured = points.some((p) => p.taux !== 0)

  const hasPocketDetail = readablePockets.length > 0

  return (
    <AdminPage>
      <PageHeader
        title="Product Sheet"
        description="The terms an investor subscribes to: minimum deposit, duration, fund cap, expected reward rate, and the targeted allocation of the money."
      />

      {f === null ? (
        // One stated absence, at the measure a sentence reads best — not a
        // 1280px band holding a single line.
        <AdminGrid>
          <AdminCol span={7} md={6}>
            <SourceAttendue
              quoi="The product sheet could not be read"
              detail="The service did not respond. No terms are shown rather than showing stale ones."
              requis={['A response from the service']}
            />
          </AdminCol>
        </AdminGrid>
      ) : (
        <>
          {/* ── Subscription terms ──────────────────────────────────────────
              The amount and the rate that pays it are one subject, so they
              share a row instead of stacking into two full-width bands. */}
          <AdminSection title="Subscription terms">
            <AdminGrid>
              <AdminCol span={5} md={4}>
                <Card className="p-6">
                  {/*
                    The deposit is the primary item; the duration and the cap
                    are the two facts that qualify it, stacked beside it at
                    their natural width.

                    The rejected version gave that pair `flex-1` inside a
                    `justify-between` row, so the two small facts were pushed
                    against the far edge of a full-width card and the gap in
                    the middle grew with the viewport. Nothing declares a
                    stretch here: the supporting facts sit next to the amount
                    and stop where their text stops.
                  */}
                  <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
                    <HeroFigure
                      valeur={formatCurrency(terms?.minimumDepositUsdc, { decimals: 0 })}
                      libelle="Minimum deposit to subscribe"
                    />
                    <div className="grid min-w-0 gap-y-3">
                      <SideFact libelle="Product duration" valeur={readableDuration(terms?.productDurationMonths)} />
                      <SideFact libelle="Fund cap" valeur={formatCurrency(cap, { decimals: 0 })} />
                    </div>
                  </div>
                </Card>
              </AdminCol>

              <AdminCol span={7} md={4}>
                <ChartFrame
                  question="How does the reward rate evolve over the product's duration?"
                  unite="in percent, per month"
                  etat={curveState(points, curveConfigured, f.vendingCurve)}
                >
                  <VendingCurveChart points={points} />
                </ChartFrame>
              </AdminCol>
            </AdminGrid>
          </AdminSection>

          {/* ── Target allocation ───────────────────────────────────────────
              The bars answer the question; the table is the detail behind
              them, including the pockets whose on-chain balance could not be
              read at all and which therefore have no bar. Side by side, one
              row instead of two. When there is no detail to show, the frame
              takes the full twelve columns rather than leaving half a row
              stranded. */}
          <AdminSection title="Target allocation">
            <AdminGrid>
              <AdminCol span={hasPocketDetail ? 6 : 12}>
                <ChartFrame
                  question="Is the money placed where it should be?"
                  unite="in percent of the portfolio"
                  etat={
                    allocation.length > 0
                      ? { type: 'tracee' }
                      : stateOf(f.terms, 'No target allocation has been recorded in the product’s terms yet.')
                  }
                >
                  <AllocationChart poches={allocation} />
                </ChartFrame>
              </AdminCol>

              {hasPocketDetail ? (
                <AdminCol span={6}>
                  <Card>
                    <CardHeader
                      title="What share does each pocket hold?"
                      hint="Targeted by the contract, observed on-chain, and the gap between the two"
                    />
                    <div className="overflow-x-auto">
                      {/* A narrower minimum than before: the table now lives in
                          half the grid, so 26rem is what keeps the four columns
                          adjacent instead of drifting apart. */}
                      <table className="w-full min-w-[26rem] text-sm">
                        <thead>
                          <tr className="border-b border-zinc-950/10 text-left text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
                            <th scope="col" className="px-4 py-2.5 font-medium">
                              Pocket
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Target
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Actual
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Variance
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                          {readablePockets.map((p, index) => {
                            const target = Number(p.targetBps)
                            const actual =
                              p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
                                ? null
                                : p.actualBps
                            const variance = readableVariance(target, actual)
                            return (
                              <tr key={p.pocket ?? p.label ?? String(index)}>
                                <th scope="row" className="px-4 py-2.5 text-left font-normal text-zinc-200">
                                  {p.label === null || p.label === undefined || p.label === ''
                                    ? (p.pocket ?? 'Unnamed pocket')
                                    : p.label}
                                </th>
                                <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{readableShare(target)}</td>
                                <td className="px-4 py-2.5 text-right text-zinc-200 tabular-nums">{readableShare(actual)}</td>
                                <td className={clsx('px-4 py-2.5 text-right tabular-nums', variance.tone)}>{variance.text}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </AdminCol>
              ) : null}
            </AdminGrid>
          </AdminSection>
        </>
      )}
    </AdminPage>
  )
}
