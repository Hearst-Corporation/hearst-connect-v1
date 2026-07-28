import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
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

/** A variance reads signed, and its magnitude decides its color. */
function readableVariance(target: number | null, actual: number | null): { text: string; tone: string } {
  if (target === null || actual === null) return { text: '—', tone: 'text-zinc-500' }
  const pts = (actual - target) / 100
  const magnitude = Math.abs(pts)
  let tone = 'text-success-400'
  if (magnitude >= 5) tone = 'text-warning-400'
  else if (magnitude >= 1) tone = 'text-zinc-300'
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

  return (
    <AdminPage>
      <PageHeader
        title="Product Sheet"
        description="The terms an investor subscribes to: minimum deposit, duration, fund cap, expected reward rate, and the targeted allocation of the money."
      />

      <AdminSection>

      {f === null ? (
        <SourceAttendue
          quoi="The product sheet could not be read"
          detail="The service did not respond. No terms are shown rather than showing stale ones."
          requis={['A response from the service']}
        />
      ) : (
        <>
          {/* ── Product terms ──────────────────────────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure
                valeur={formatCurrency(terms?.minimumDepositUsdc, { decimals: 0 })}
                libelle="Minimum deposit to subscribe"
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                <SideFact libelle="Product duration" valeur={readableDuration(terms?.productDurationMonths)} />
                <SideFact libelle="Fund cap" valeur={formatCurrency(cap, { decimals: 0 })} />
              </dl>
            </div>
          </Card>

          {/* ── Reward rate ─────────────────────────────────────────────────── */}
          <ChartFrame
            question="How does the reward rate evolve over the product's duration?"
            unite="in percent, per month"
            etat={curveState(points, curveConfigured, f.vendingCurve)}
          >
            <VendingCurveChart points={points} />
          </ChartFrame>

          {/* ── Target allocation ───────────────────────────────────────────── */}
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

          {readablePockets.length > 0 ? (
            <Card>
              <CardHeader
                title="What share does each pocket hold?"
                hint="The share targeted by the contract, the share observed on-chain, and the gap between the two"
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left text-xs text-zinc-500">
                      <th scope="col" className="px-5 py-2.5 font-medium">
                        Pocket
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Target
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Actual
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Variance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
                    {readablePockets.map((p, index) => {
                      const target = Number(p.targetBps)
                      const actual =
                        p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
                          ? null
                          : p.actualBps
                      const variance = readableVariance(target, actual)
                      return (
                        <tr key={p.pocket ?? p.label ?? String(index)}>
                          <th scope="row" className="px-5 py-3 text-left font-normal text-zinc-200">
                            {p.label === null || p.label === undefined || p.label === ''
                              ? (p.pocket ?? 'Unnamed pocket')
                              : p.label}
                          </th>
                          <td className="px-5 py-3 text-right text-zinc-400 tabular-nums">{readableShare(target)}</td>
                          <td className="px-5 py-3 text-right text-zinc-200 tabular-nums">{readableShare(actual)}</td>
                          <td className={clsx('px-5 py-3 text-right tabular-nums', variance.tone)}>{variance.text}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      )}

      {/* The raw response stays available at the bottom of the page, for
          anyone who needs to check a field the business-level reading doesn't expose. */}
      </AdminSection>
    </AdminPage>
  )
}
