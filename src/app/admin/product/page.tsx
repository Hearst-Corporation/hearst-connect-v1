import { DashCard, PanelHeaderLink, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { HearstCurveChart, ReserveExposureChart, type BitcoinItem } from '@/components/charts'
import { AdminTable, Callout, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { figureFromResolved } from '@/lib/backend/availability'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber } from '@/lib/format'
import { readableSourceState } from '@/lib/movements'
import { seriesStateFrom } from '@/lib/series-state'
import { editorial } from '@/lib/vaults/model'
import {
  CircleStackIcon,
  CpuChipIcon,
  SignalIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const MINING_ENDPOINT = '/api/v1/mining'
const BTC_ENDPOINT = '/api/v1/btc'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

/**
 * Consolidated product view — top-level blocks.
 * Sources: mining, btc, product-factsheet, backtest-historical.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Mining = {
  readonly hashrate?: Resolved<{ reportedHashrateTh: string; totalBtcEarnedSats: string }>
  readonly electricity?: Resolved<{ monthlyCost: string }>
  readonly operationalTelemetry?: Resolved<unknown>
}

type Btc = {
  readonly reserve?: Resolved<{ balanceUsdc: string | null }>
  readonly exposure?: Resolved<{ valueUsdc: string | null; pouch: string | null }>
  readonly btcProduced?: Resolved<{ totalSats: string }>
  readonly attribution?: Resolved<unknown>
}

type Factsheet = {
  readonly tvlCap?: Resolved<string | number>
  readonly vendingCurve?: Resolved<readonly { month: number; bps: number }[]>
}

type Backtest = { readonly runs?: Resolved<unknown> }

function orNull(text: string): string | null {
  return text === '—' ? null : text
}

function btcProducedFrom(totalSats: string | null | undefined): string | null {
  if (totalSats === undefined || totalSats === null) return null
  const sats = Number(totalSats)
  if (!Number.isFinite(sats)) return null
  return formatNumber(sats / 100_000_000, { maximumFractionDigits: 4 })
}

type ReserveItem = { readonly item: string; readonly amount: number }

function reserveExposureItems(
  reserveUsdc: string | null | undefined,
  exposureUsdc: string | null | undefined,
): readonly ReserveItem[] {
  // `balanceUsdc` / `valueUsdc` are whole-USDC strings (codebase `*Usdc`
  // convention, cf. factsheet `minimumDepositUsdc`) — no atomic divisor.
  const items: ReserveItem[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    items.push({ item: 'Reserve', amount: Number(reserveUsdc) })
  }
  if (exposureUsdc !== null && exposureUsdc !== undefined && Number.isFinite(Number(exposureUsdc))) {
    items.push({ item: 'Exposure', amount: Number(exposureUsdc) })
  }
  return items
}

function curvePointsFrom(
  rawCurve: readonly { month: number; bps: number }[] | null | undefined,
): readonly { month: number; rate: number }[] {
  if (rawCurve === null || rawCurve === undefined) return []
  return rawCurve.map((p) => ({ month: p.month, rate: p.bps / 100 }))
}

function curveConfiguredFrom(points: readonly { month: number; rate: number }[]): boolean {
  return points.some((p) => p.rate !== 0)
}

function curveExplanation(
  points: readonly { month: number; rate: number }[],
  curveConfigured: boolean,
  vendingCurve: Resolved<unknown> | undefined,
): string {
  if (points.length === 0) {
    const state = seriesStateFrom(vendingCurve, 'Product terms have not been submitted yet.')
    if (state.type === 'pending' || state.type === 'unavailable') return state.explanation
    return 'Product terms have not been submitted yet.'
  }
  if (curveConfigured) return 'Curve configured — milestones with non-zero rates.'
  return 'All five product milestones are defined, but no rate has been recorded yet. The curve will appear once they are.'
}

function seriesExplanation(field: Resolved<unknown> | undefined, fallback: string): string {
  const state = seriesStateFrom(field, fallback)
  if (state.type === 'pending' || state.type === 'unavailable') return state.explanation
  return fallback
}

type CurveChartState =
  | { readonly type: 'unavailable'; readonly explanation: string }
  | { readonly type: 'pending'; readonly explanation: string }
  | { readonly type: 'plotted' }

function curveChartState(factsheetOk: boolean, curveConfigured: boolean): CurveChartState {
  if (!factsheetOk) {
    return {
      type: 'unavailable',
      explanation: 'The product factsheet did not respond — the yield curve cannot be read.',
    }
  }
  if (!curveConfigured) {
    return {
      type: 'pending',
      explanation: 'The yield curve is not configured yet.',
    }
  }
  return { type: 'plotted' }
}

/**
 * Fixed panel slots (content area, px) — the box is FROZEN whether data is
 * absent, partial, or plotted; taller content scrolls inside the box
 * (`scrollbar-none`). Both cards of a row share the same slot, so each row's
 * two columns end on the same line at any data state.
 */
const PANEL_SLOT_CLASS = {
  production: 'h-[304px] overflow-y-auto scrollbar-none',
  capital: 'h-[304px] overflow-y-auto scrollbar-none',
  curve: 'h-[304px] overflow-y-auto scrollbar-none',
  milestones: 'h-[304px] overflow-y-auto scrollbar-none',
} as const

type PanelSlot = keyof typeof PANEL_SLOT_CLASS

function ProductPanel({
  title,
  subtitle,
  action,
  slot,
  children,
}: Readonly<{
  title: string
  subtitle: string
  action?: ReactNode
  slot: PanelSlot
  children: ReactNode
}>) {
  return (
    <DashCard
      className="min-w-0"
      contentClassName={PANEL_SLOT_CLASS[slot]}
      title={title}
      subtitle={subtitle}
      action={action}
    >
      {children}
    </DashCard>
  )
}

/** One compact reading row — label left, tabular figure right. */
function ReadingRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="min-w-0 text-xs font-medium text-fg-tertiary">{label}</dt>
      <dd className="shrink-0 text-sm font-semibold tabular-nums text-fg">{value}</dd>
    </div>
  )
}

function CapitalReserveSection({
  items,
  soleItem,
  chartItems,
}: Readonly<{
  items: readonly ReserveItem[]
  soleItem: ReserveItem | undefined
  chartItems: readonly BitcoinItem[]
}>) {
  if (items.length === 0) {
    return <PanelState title="No readable position" detail="Neither reserve nor exposure could be read on-chain." />
  }

  if (soleItem !== undefined) {
    return (
      <>
        <dl className="divide-y divide-console-line-soft">
          <ReadingRow
            label={soleItem.item}
            value={formatCurrency(soleItem.amount, { fromAtomic: 1, decimals: 0 })}
          />
        </dl>
        <Callout tone="info" className="mt-4">
          The other position could not be read on-chain. Only one of the two positions is readable — reserve and
          exposure cannot be compared yet.
        </Callout>
      </>
    )
  }

  return (
    <>
      <ReserveExposureChart items={chartItems} />
      <div className="mt-2 border-t border-console-line-soft pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-semibold text-fg">Capital allocation</p>
          <p className="text-[11px] text-fg-tertiary">{items.length} positions</p>
        </div>
        <p className="mt-0.5 text-[11px] text-fg-tertiary">
          in dollars — idle reserve vs exposed value · Reserve and exposure read on-chain — the exact figures the
          chart positions.
        </p>
      </div>
      <AdminTable className="mt-2">
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Position</TableHeader>
            <TableHeader className={tableCol.numeric}>Amount (USD)</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.item}>
              <TableCell className={tableCol.primary}>
                <div className="truncate font-medium">{p.item}</div>
              </TableCell>
              <TableCell className={tableCol.numeric}>{formatCurrency(p.amount, { fromAtomic: 1, decimals: 0 })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>
    </>
  )
}

type PendingReading = {
  readonly key: string
  readonly label: string
  readonly explanation: string
  readonly status: string | undefined
}

function pendingReadingsFrom(
  backtest: Awaited<ReturnType<typeof callBackend<Backtest>>>,
  b: Btc | null,
  m: Mining | null,
): readonly PendingReading[] {
  return [
    {
      key: 'backtest',
      label: 'Performance vs history',
      explanation: seriesExplanation(
        backtest.ok ? backtest.data.runs : undefined,
        'No backtest has been run on this deployment yet.',
      ),
      status: backtest.ok ? backtest.data.runs?.status : undefined,
    },
    {
      key: 'attribution',
      label: 'Yield breakdown',
      explanation: seriesExplanation(b?.attribution, 'The yield breakdown has not been calculated yet.'),
      status: b?.attribution?.status,
    },
    {
      key: 'telemetry',
      label: 'Operational telemetry',
      explanation: seriesExplanation(
        m?.operationalTelemetry,
        'Operational telemetry has not been submitted yet.',
      ),
      status: m?.operationalTelemetry?.status,
    },
  ]
}

function productKpisFrom(
  mining: Awaited<ReturnType<typeof callBackend<Mining>>>,
  btc: Awaited<ReturnType<typeof callBackend<Btc>>>,
  factsheet: Awaited<ReturnType<typeof callBackend<Factsheet>>>,
  m: Mining | null,
  b: Btc | null,
  f: Factsheet | null,
): readonly AdminHeroKpi[] {
  const hashrateCell = figureFromResolved(mining.ok ? m?.hashrate : undefined, MINING_ENDPOINT, (h) =>
    formatNumber(Number(h.reportedHashrateTh)),
  )
  const btcProducedCell = figureFromResolved(
    btc.ok ? b?.btcProduced : undefined,
    BTC_ENDPOINT,
    (p) => btcProducedFrom(p.totalSats) ?? '—',
  )
  const capCell = figureFromResolved(factsheet.ok ? f?.tvlCap : undefined, FACTSHEET_ENDPOINT, (c) =>
    formatCurrency(c, { decimals: 0, fromAtomic: 1 }),
  )

  return [
    { id: 'hashrate', title: 'Hashrate', value: hashrateCell, unit: 'TH/s', icon: CpuChipIcon },
    { id: 'btc-produced', title: 'BTC produced', value: btcProducedCell, unit: 'BTC', icon: CircleStackIcon },
    { id: 'cap', title: 'Cap', value: capCell, icon: Square3Stack3DIcon },
    {
      id: 'source-btc',
      title: 'BTC source',
      value: editorial(b === null ? 'Unavailable' : 'Reachable'),
      icon: SignalIcon,
    },
  ]
}

export default async function Page() {
  await requireSession()
  const [mining, btc, factsheet, backtest] = await Promise.all([
    callBackend<Mining>('mining'),
    callBackend<Btc>('btc'),
    callBackend<Factsheet>('product-factsheet'),
    callBackend<Backtest>('backtest-historical'),
  ])

  const m = mining.ok ? mining.data : null
  const b = btc.ok ? btc.data : null
  const f = factsheet.ok ? factsheet.data : null

  const hashrate = m?.hashrate?.value
  const btcProduced = btcProducedFrom(b?.btcProduced?.value?.totalSats)

  const items = reserveExposureItems(b?.reserve?.value?.balanceUsdc, b?.exposure?.value?.valueUsdc)
  const soleItem = items.length === 1 ? items[0] : undefined
  const chartItems: readonly BitcoinItem[] = items.map((p) => ({
    item: p.item,
    amount: p.amount,
    accent: p.item === 'Exposure',
  }))

  const points = curvePointsFrom(f?.vendingCurve?.value)
  const curveConfigured = curveConfiguredFrom(points)
  const cap = f?.tvlCap?.value
  const curveState = curveChartState(factsheet.ok, curveConfigured)

  const pendingReadings = pendingReadingsFrom(backtest, b, m)
  const kpis = productKpisFrom(mining, btc, factsheet, m, b, f)

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Consolidated product view"
        description="Mining, BTC, and product factsheet readings — no invented values."
        kpis={kpis}
      />

      {/*
        Rows whose heights MATCH by construction: both cards of a row share the
        same frozen content slot (PANEL_SLOT_CLASS), so the two columns end on
        the same line at any data state — absence, partial read, or plotted.
        Links live on the card title row (DashCard `action`), not in a footer.
      */}
      {/* Row A — production rail + capital. */}
      <BentoGrid>
        <BentoCard span={4}>
          <ProductPanel
            title="Production"
            subtitle="Fund · Reported hashrate and figures that qualify it."
            slot="production"
            action={<PanelHeaderLink href="/admin/mining">Open mining</PanelHeaderLink>}
          >
            <dl className="divide-y divide-console-line-soft">
              <ReadingRow
                label="Reported hashrate"
                value={hashrate ? `${formatNumber(Number(hashrate.reportedHashrateTh))} TH/s` : '—'}
              />
              <ReadingRow label="BTC produced" value={btcProduced === null ? '—' : `${btcProduced} BTC`} />
              <ReadingRow
                label="Monthly electricity cost"
                value={
                  orNull(
                    formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0, fromAtomic: 1_000_000 }),
                  ) ?? '—'
                }
              />
              <ReadingRow
                label="Fund cap"
                value={cap ? (orNull(formatCurrency(cap, { decimals: 0, fromAtomic: 1 })) ?? '—') : '—'}
              />
            </dl>
          </ProductPanel>
        </BentoCard>
        <BentoCard span={8}>
          <ProductPanel
            title="Where is the fund's capital?"
            subtitle="Reserve and yield · The two readings the product is actually measured on today."
            slot="capital"
          >
            <CapitalReserveSection items={items} soleItem={soleItem} chartItems={chartItems} />
          </ProductPanel>
        </BentoCard>
      </BentoGrid>

      {/* Row B — the yield pair: dominant curve, bounded milestones table. */}
      <BentoGrid>
        <BentoCard span={8}>
          <ProductPanel
            title="How does yield evolve over time?"
            subtitle={curveExplanation(points, curveConfigured, f?.vendingCurve)}
            slot="curve"
          >
            <p className="text-[11px] text-fg-tertiary">as a percentage, per product milestone</p>
            {curveState.type === 'plotted' ? (
              <HearstCurveChart points={points} />
            ) : (
              <PanelState
                title={curveState.type === 'unavailable' ? 'Data unavailable' : 'Waiting on source'}
                detail={curveState.explanation}
              />
            )}
          </ProductPanel>
        </BentoCard>
        <BentoCard span={4}>
          <ProductPanel
            title="Yield curve"
            subtitle="Reserve and yield · Rate recorded per milestone — the exact figures the curve positions."
            slot="milestones"
            action={
              points.length > 0 ? (
                <span className="shrink-0 text-xs text-fg-tertiary">{points.length} milestones</span>
              ) : undefined
            }
          >
            {points.length === 0 ? (
              <PanelState title="No readable milestones for now." />
            ) : (
              <AdminTable>
                <TableHead>
                  <TableRow>
                    <TableHeader className={tableCol.primary}>Month</TableHeader>
                    <TableHeader className={tableCol.numeric}>Rate %</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {points.map((p) => (
                    <TableRow key={p.month}>
                      <TableCell className={tableCol.primary}>{formatNumber(p.month)}</TableCell>
                      <TableCell className={tableCol.numeric}>
                        {formatNumber(p.rate, { maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminTable>
            )}
          </ProductPanel>
        </BentoCard>
      </BentoGrid>

      {/* Row C — pending readings: always exactly three rows, full-width band. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            title="Not measurable yet"
            subtitle="Three views whose question, axis, and unit are already decided. None charts until the service provides its series — the displayed state is what the source announces."
            action={
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-fg-tertiary">{pendingReadings.length} readings</span>
                <PanelHeaderLink href="/admin/runtime">Source health</PanelHeaderLink>
              </div>
            }
          >
            <AdminTable>
              <TableHead>
                <TableRow>
                  <TableHeader className={tableCol.primary}>Reading</TableHeader>
                  <TableHeader className={tableCol.primary}>Why it does not appear yet</TableHeader>
                  <TableHeader className={tableCol.status}>Source state</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingReadings.map((reading) => (
                  <TableRow key={reading.key}>
                    <TableCell className={tableCol.primary}>
                      <div className="truncate font-medium">{reading.label}</div>
                    </TableCell>
                    <TableCell className={`${tableCol.primary} text-fg-tertiary`}>{reading.explanation}</TableCell>
                    <TableCell className={tableCol.status}>
                      {reading.status ? readableSourceState(reading.status) : 'Not reported'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminTable>
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
