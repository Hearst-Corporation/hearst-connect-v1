import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import {
  ChartFrame,
  HearstCurveChart,
  ReserveExposureChart,
  type BitcoinItem,
} from '@/components/charts'
import { Callout, DataTableShell, SectionCard, SectionHeader, tableCol } from '@/components/compositions'
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
  const items: ReserveItem[] = []
  if (reserveUsdc !== null && reserveUsdc !== undefined && Number.isFinite(Number(reserveUsdc))) {
    items.push({ item: 'Reserve', amount: Number(reserveUsdc) / 1_000_000 })
  }
  if (exposureUsdc !== null && exposureUsdc !== undefined && Number.isFinite(Number(exposureUsdc))) {
    items.push({ item: 'Exposure', amount: Number(exposureUsdc) / 1_000_000 })
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
    return <Callout tone="warning">Neither reserve nor exposure could be read on-chain.</Callout>
  }

  if (soleItem !== undefined) {
    return (
      <>
        <DescriptionList>
          <DescriptionTerm>{soleItem.item}</DescriptionTerm>
          <DescriptionDetails>
            {formatCurrency(soleItem.amount, { fromAtomic: 1, decimals: 0 })}
          </DescriptionDetails>
        </DescriptionList>
        <Callout tone="info" className="mt-4">
          The other position could not be read on-chain. Only one of the two positions is readable — reserve and
          exposure cannot be compared yet.
        </Callout>
      </>
    )
  }

  return (
    <>
      <ChartFrame
        question="Where is the fund's capital?"
        unit="in dollars — idle reserve vs exposed value"
        state={{ type: 'plotted' }}
      >
        <ReserveExposureChart items={chartItems} />
      </ChartFrame>
      <DataTableShell
        title="Capital allocation"
        description="Reserve and exposure read on-chain — the exact figures the chart positions."
        count={`${items.length} positions`}
        className="mt-6"
      >
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
      </DataTableShell>
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
    formatCurrency(c, { decimals: 0 }),
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

  const pendingReadings = pendingReadingsFrom(backtest, b, m)
  const kpis = productKpisFrom(mining, btc, factsheet, m, b, f)

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Consolidated product view"
        description="Mining, BTC, and product factsheet readings — no invented values."
        kpis={kpis}
      />

      <SectionCard title="Production" eyebrow="Fund" hint="Reported hashrate and figures that qualify it.">
        <DescriptionList>
          <DescriptionTerm>Reported hashrate</DescriptionTerm>
          <DescriptionDetails>
            {hashrate ? `${formatNumber(Number(hashrate.reportedHashrateTh))} TH/s` : '—'}
          </DescriptionDetails>
          <DescriptionTerm>BTC produced</DescriptionTerm>
          <DescriptionDetails>{btcProduced === null ? '—' : `${btcProduced} BTC`}</DescriptionDetails>
          <DescriptionTerm>Monthly electricity cost</DescriptionTerm>
          <DescriptionDetails>
            {orNull(formatCurrency(m?.electricity?.value?.monthlyCost, { decimals: 0 })) ?? '—'}
          </DescriptionDetails>
          <DescriptionTerm>Fund cap</DescriptionTerm>
          <DescriptionDetails>
            {cap ? (orNull(formatCurrency(cap, { decimals: 0 })) ?? '—') : '—'}
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>

      <section className="space-y-6">
        <SectionHeader
          title="Where is the fund's capital?"
          eyebrow="Reserve and yield"
          hint="The two readings the product is actually measured on today."
        />
        <CapitalReserveSection items={items} soleItem={soleItem} chartItems={chartItems} />
      </section>

      <section className="space-y-6">
        <SectionHeader
          title="How does yield evolve over time?"
          eyebrow="Reserve and yield"
          hint={curveExplanation(points, curveConfigured, f?.vendingCurve)}
        />
        <ChartFrame
          question="How does yield evolve over time?"
          unit="as a percentage, per product milestone"
          state={curveChartState(factsheet.ok, curveConfigured)}
        >
          <HearstCurveChart points={points} />
        </ChartFrame>
        <DataTableShell
          title="Yield curve"
          description="Rate recorded per milestone — the exact figures the curve positions."
          count={points.length > 0 ? `${points.length} milestones` : undefined}
          calme={points.length === 0 ? 'No readable milestones for now.' : undefined}
        >
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
                <TableCell className={tableCol.numeric}>{formatNumber(p.rate, { maximumFractionDigits: 2 })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      </section>

      <DataTableShell
        title="Not measurable yet"
        description="Three views whose question, axis, and unit are already decided. None charts until the service provides its series — the displayed state is what the source announces."
        count={`${pendingReadings.length} readings`}
      >
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
      </DataTableShell>
    </div>
  )
}
