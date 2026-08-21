import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { DashCard, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { surfaceInset } from '@/components/admin/surface'
import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import clsx from 'clsx'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { requireSession } from '@/lib/auth'
import type { ResolvedStatus } from '@/lib/resolved'
import { available, unavailable, type Availability } from '@/lib/vaults/model'
import {
  CpuChipIcon,
  BoltIcon,
  CircleStackIcon,
  BanknotesIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { ApproveButton } from './approve-button'
import { MiningVaultSwitcher, type MiningVaultOption } from './mining-vault-switcher'
import { MonthlyBtcChart } from './monthly-btc-chart'
import { PayElectricityButton } from './pay-electricity-button'
import { ReportMetricsButton } from './report-metrics-button'
import { TriggerCalculationButton } from './trigger-calculation-button'

export const metadata: Metadata = { title: 'Mining' }
export const dynamic = 'force-dynamic'

/* ── Types ───────────────────────────────────────────────────────────────── */

type Resolved<T> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
}

type MiningAggregate = {
  readonly hashrate?: Resolved<{
    reportedHashrateTh: string
    totalBtcEarnedSats: string
  }>
  readonly electricity?: Resolved<{
    monthlyCost: string
    kwhConsumed: string
    costPerKwh: string
  }>
  readonly operationalTelemetry?: Resolved<{
    machineCount: number
    activeMachines: number
    averageUptimePct: number
  }>
}

type BtcAggregate = {
  readonly btcProduced?: Resolved<{ totalSats: string; currentPriceUsdc: string }>
  readonly reserve?: Resolved<{ balanceUsdc: string }>
}

type RwaPocket = {
  readonly pocket: string
  readonly label: string | null
  readonly targetBps: number
  readonly actualBps: number | null
  readonly enabled: boolean
}

/** Placeholder — backend does not yet expose distributions. */
type DistributionRecord = {
  readonly id: string
  readonly month: string
  readonly distributionDate: string
  readonly btcAmountSats: string
  readonly btcPriceUsdc: string
  readonly yieldUsdc: string
  readonly rwaStrategyId: string
  readonly status: 'pending' | 'approved' | 'distributed'
  readonly approvedAt: string | null
  readonly approvedBy: string | null
}

type CalculationRecord = {
  readonly id: string
  readonly period: string
  readonly btcAmountSats: string
  readonly btcPriceUsdc: string
  readonly grossYieldUsdc: string
  readonly opexDeductionUsdc: string
  readonly netYieldUsdc: string
  readonly rwaStrategyId: string
  readonly calculatedAt: string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function satsToBtc(sats: string | null | undefined): string | null {
  if (sats === undefined || sats === null) return null
  const n = Number(sats)
  if (!Number.isFinite(n)) return null
  return formatNumber(n / 100_000_000, { maximumFractionDigits: 4 })
}

function btcValueUsdc(sats: string | null, price: string | null): string | null {
  if (sats === null || price === null) return null
  const btc = Number(sats) / 100_000_000
  const p = Number(price)
  if (!Number.isFinite(btc) || !Number.isFinite(p)) return null
  return formatCurrency(btc * p, { decimals: 0 })
}

/**
 * Hero KPI reading — an ALREADY-formatted value when the backend carried one,
 * a named absence (status + reason from the Resolved bloc) when it did not.
 */
function kpiReading(
  resolved: Resolved<unknown> | undefined,
  value: string | null,
): Availability<string> {
  if (value !== null) return available(value)
  return unavailable({
    reason: resolved?.reason ?? null,
    status: (resolved?.status ?? 'UNAVAILABLE') as ResolvedStatus,
  })
}

/**
 * Frozen panel slots — the box is FROZEN whether data is loading, absent, or
 * plentiful; taller content scrolls inside (`scrollbar-none`). Paired tables
 * share ONE slot height, so a row's columns end on the same line at any data
 * state; flanks chain `h-full` down to a scrolling content area instead.
 */
const PANEL_SLOT_CLASS = {
  table: 'h-[320px] overflow-y-auto scrollbar-none',
  fill: 'flex-1 min-h-0 overflow-y-auto scrollbar-none',
} as const

/* ── Sections ────────────────────────────────────────────────────────────── */

function MachineFleetSection({
  machineCount,
  activeMachines,
  averageUptimePct,
}: Readonly<{
  machineCount: number | null
  activeMachines: number | null
  averageUptimePct: number | null
}>) {
  const hasData = machineCount !== null || activeMachines !== null || averageUptimePct !== null

  if (!hasData) {
    return (
      <DashCard title="Machine fleet" subtitle="Operational telemetry" className="h-full">
        <PanelState title="Fleet telemetry unavailable." />
      </DashCard>
    )
  }

  const inactiveMachines =
    machineCount !== null && activeMachines !== null ? machineCount - activeMachines : null

  return (
    <DashCard title="Machine fleet" subtitle="Operational telemetry" className="h-full">
      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-3 @[24rem]:grid-cols-2 @[40rem]:grid-cols-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Total machines</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {machineCount !== null ? formatNumber(machineCount) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Active</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-success-400">
              {activeMachines !== null ? formatNumber(activeMachines) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Inactive</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-danger-400">
              {inactiveMachines !== null ? formatNumber(inactiveMachines) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Average uptime</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {averageUptimePct !== null ? formatPercent(averageUptimePct / 100) : '—'}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-fg-tertiary">
        Per-machine detail (model, location, serial) will appear once the backend exposes a fleet
        registry endpoint.
      </p>
    </DashCard>
  )
}

function ReportMetricsSection() {
  return (
    <DashCard
      title="Report metrics"
      subtitle="Keeper action"
      className="h-full"
      contentClassName="flex-1"
    >
      <Text className="text-sm text-fg-tertiary">
        Submit hashrate and cumulative BTC earned to the backend. This is a Keeper log request — no
        transaction is signed.
      </Text>
      <div className="mt-auto pt-4">
        <ReportMetricsButton />
      </div>
    </DashCard>
  )
}

function OpexSection({
  monthlyCost,
  kwhConsumed,
  costPerKwh,
}: Readonly<{
  monthlyCost: string | null
  kwhConsumed: string | null
  costPerKwh: string | null
}>) {
  const hasData = monthlyCost !== null || kwhConsumed !== null || costPerKwh !== null

  if (!hasData) {
    return (
      <DashCard title="OPEX" subtitle="Operational expenses" className="h-full">
        <PanelState title="Electricity data unavailable." />
      </DashCard>
    )
  }

  return (
    <DashCard
      title="OPEX"
      subtitle="Operational expenses"
      className="h-full"
      contentClassName="flex-1"
    >
      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-3 @[26rem]:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Monthly electricity</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {monthlyCost !== null ? formatCurrency(monthlyCost, { decimals: 0 }) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">kWh consumed</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {kwhConsumed !== null ? formatNumber(Number(kwhConsumed), { maximumFractionDigits: 0 }) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Cost per kWh</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
              {costPerKwh !== null ? formatCurrency(costPerKwh, { decimals: 2 }) : '—'}
            </p>
          </div>
        </div>
      </div>
      {monthlyCost !== null ? (
        <div className="mt-auto max-w-xs pt-4">
          <PayElectricityButton amount={monthlyCost} />
        </div>
      ) : null}
    </DashCard>
  )
}

function YieldCalculationSection({
  btcEarnedSats,
  btcPrice,
  electricityCost,
}: Readonly<{
  btcEarnedSats: string | null
  btcPrice: string | null
  electricityCost: string | null
}>) {
  const grossYield = btcValueUsdc(btcEarnedSats, btcPrice)
  const netYield =
    grossYield !== null && electricityCost !== null
      ? formatCurrency(
          Number(grossYield.replace(/[^0-9.-]/g, '')) - Number(electricityCost),
          { decimals: 0 },
        )
      : null

  return (
    <DashCard
      title="Yield calculation"
      subtitle="Gross vs net for RWA distribution"
      className="h-full"
      contentClassName="flex-1"
    >
      <div className="@container min-w-0">
        <div className="grid grid-cols-1 gap-3 @[26rem]:grid-cols-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Gross yield</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-accent-400">
              {grossYield ?? '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">OPEX deduction</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-danger-400">
              {electricityCost ? `-${formatCurrency(electricityCost, { decimals: 0 })}` : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-tertiary">Net yield to RWA</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-success-400">
              {netYield ?? '—'}
            </p>
          </div>
        </div>
      </div>
      <p className="mt-auto pt-3 text-xs text-fg-tertiary">
        Net yield = gross BTC value minus electricity OPEX. This is the amount available for monthly
        distribution to the RWA strategy.
      </p>
    </DashCard>
  )
}

function NextDistributionCard({
  distribution,
}: Readonly<{
  distribution: DistributionRecord | null
}>) {
  return (
    <DashCard
      title="Next distribution"
      subtitle={
        distribution !== null
          ? `Scheduled for ${formatDateTime(distribution.distributionDate)}`
          : 'Upcoming monthly yield'
      }
      className="h-full"
      contentClassName={PANEL_SLOT_CLASS.fill}
    >
      {distribution === null ? (
        <PanelState title="No pending distribution scheduled." />
      ) : (
        <div className="space-y-4">
          <div className="@container min-w-0">
            <div className="grid grid-cols-1 gap-3 @[20rem]:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-fg-tertiary">BTC amount</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
                  {satsToBtc(distribution.btcAmountSats) ?? '—'} BTC
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-fg-tertiary">Value at price</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-fg">
                  {btcValueUsdc(distribution.btcAmountSats, distribution.btcPriceUsdc) ?? '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-console-line-soft pt-4">
            <div>
              <p className="text-xs font-medium text-fg-tertiary">Target strategy</p>
              <p className="text-sm font-medium text-fg">{distribution.rwaStrategyId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-fg-tertiary">Status</p>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  distribution.status === 'approved'
                    ? 'bg-success-400/10 text-success-400'
                    : distribution.status === 'distributed'
                      ? 'bg-accent-400/10 text-accent-400'
                      : 'bg-warning-400/10 text-warning-400'
                }`}
              >
                {distribution.status}
              </span>
            </div>
          </div>
          {distribution.status === 'pending' ? <ApproveButton distributionId={distribution.id} /> : null}
        </div>
      )}
    </DashCard>
  )
}

function DistributionHistory({
  distributions,
}: Readonly<{
  distributions: readonly DistributionRecord[]
}>) {
  if (distributions.length === 0) {
    return (
      <DashCard title="Distribution history" className="h-full">
        <PanelState title="No previous distributions recorded." />
      </DashCard>
    )
  }

  return (
    <DashCard
      title="Distribution history"
      className="h-full"
      contentClassName={PANEL_SLOT_CLASS.table}
      action={<Badge color="neutral">{`${distributions.length}`}</Badge>}
    >
      <AdminTable>
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.date}>Month</TableHeader>
            <TableHeader className={tableCol.date}>Date</TableHeader>
            <TableHeader className={tableCol.numeric}>BTC</TableHeader>
            <TableHeader className={tableCol.numeric}>Value</TableHeader>
            <TableHeader className={tableCol.hash}>Strategy</TableHeader>
            <TableHeader className={tableCol.status}>Status</TableHeader>
            <TableHeader className={tableCol.date}>Approved</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {distributions.map((d) => (
            <TableRow key={d.id}>
              <TableCell className={tableCol.date}>{d.month}</TableCell>
              <TableCell className={tableCol.date}>{formatDateTime(d.distributionDate)}</TableCell>
              <TableCell className={tableCol.numeric}>
                {satsToBtc(d.btcAmountSats) ?? '—'} BTC
              </TableCell>
              <TableCell className={tableCol.numeric}>
                {btcValueUsdc(d.btcAmountSats, d.btcPriceUsdc) ?? '—'}
              </TableCell>
              <TableCell className={tableCol.hash}>{d.rwaStrategyId}</TableCell>
              <TableCell className={tableCol.status}>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    d.status === 'approved'
                      ? 'bg-success-400/10 text-success-400'
                      : d.status === 'distributed'
                        ? 'bg-accent-400/10 text-accent-400'
                        : 'bg-warning-400/10 text-warning-400'
                  }`}
                >
                  {d.status}
                </span>
              </TableCell>
              <TableCell className={tableCol.date}>
                {d.approvedAt ? formatDateTime(d.approvedAt) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>
    </DashCard>
  )
}

function numericValue(v: string | null | undefined): number | null {
  if (v === undefined || v === null || v === '' || v === 'null' || v === 'undefined') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function isCalculationComplete(c: CalculationRecord): boolean {
  return numericValue(c.btcAmountSats) !== null && numericValue(c.grossYieldUsdc) !== null
}

function CalculationsSection({
  calculations,
  nextPeriod,
  defaultStrategyId,
}: Readonly<{
  calculations: readonly CalculationRecord[]
  nextPeriod: string
  defaultStrategyId: string
}>) {
  if (calculations.length === 0) {
    return (
      <DashCard
        title="Calculations"
        subtitle="Historical yield calculations"
        className="h-full"
        contentClassName="gap-3"
      >
        <PanelState title="No calculations recorded yet." />
        <div className="max-w-xs">
          <TriggerCalculationButton period={nextPeriod} rwaStrategyId={defaultStrategyId} />
        </div>
      </DashCard>
    )
  }

  const incompleteCount = calculations.filter((c) => !isCalculationComplete(c)).length

  return (
    <DashCard
      title="Calculation history"
      subtitle="Historical yield calculations"
      className="h-full"
      contentClassName="gap-3"
      action={<Badge color="neutral">{`${calculations.length}`}</Badge>}
    >
      {incompleteCount > 0 ? (
        <p className="text-xs text-fg-tertiary">
          {`${incompleteCount} calculation(s) incomplete — trigger again or check backend logs.`}
        </p>
      ) : null}
      <div className={PANEL_SLOT_CLASS.table}>
        <AdminTable>
          <TableHead>
            <TableRow>
              <TableHeader className={tableCol.date}>Period</TableHeader>
              <TableHeader className={tableCol.numeric}>BTC</TableHeader>
              <TableHeader className={tableCol.numeric}>Gross yield</TableHeader>
              <TableHeader className={tableCol.numeric}>OPEX</TableHeader>
              <TableHeader className={tableCol.numeric}>Net yield</TableHeader>
              <TableHeader className={tableCol.hash}>Strategy</TableHeader>
              <TableHeader className={tableCol.status}>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {calculations.map((c) => {
              const complete = isCalculationComplete(c)
              const opexValue = formatCurrency(c.opexDeductionUsdc, { decimals: 0 })
              return (
                <TableRow key={c.id}>
                  <TableCell className={tableCol.date}>{c.period}</TableCell>
                  <TableCell className={tableCol.numeric}>
                    {complete ? `${satsToBtc(c.btcAmountSats)} BTC` : '—'}
                  </TableCell>
                  <TableCell className={tableCol.numeric}>
                    {complete ? formatCurrency(c.grossYieldUsdc, { decimals: 0 }) : '—'}
                  </TableCell>
                  <TableCell className={`${tableCol.numeric} text-danger-400`}>
                    {complete && opexValue !== '—' ? `-${opexValue}` : '—'}
                  </TableCell>
                  <TableCell className={`${tableCol.numeric} text-success-400`}>
                    {complete ? formatCurrency(c.netYieldUsdc, { decimals: 0 }) : '—'}
                  </TableCell>
                  <TableCell className={tableCol.hash}>{c.rwaStrategyId}</TableCell>
                  <TableCell className={tableCol.status}>
                    {complete ? (
                      <span className="inline-flex rounded-full bg-success-400/10 px-2 py-0.5 text-xs font-medium text-success-400">
                        complete
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-warning-400/10 px-2 py-0.5 text-xs font-medium text-warning-400">
                        incomplete
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </AdminTable>
      </div>
      <div className="max-w-xs">
        <TriggerCalculationButton period={nextPeriod} rwaStrategyId={defaultStrategyId} />
      </div>
    </DashCard>
  )
}

function StrategyAllocationSection({
  distributions,
  rwaPockets,
}: Readonly<{
  distributions: readonly DistributionRecord[]
  rwaPockets: readonly RwaPocket[]
}>) {
  const strategyTotals = new Map<string, number>()
  for (const d of distributions) {
    const sats = Number(d.btcAmountSats)
    if (!Number.isFinite(sats)) continue
    const existing = strategyTotals.get(d.rwaStrategyId)
    strategyTotals.set(d.rwaStrategyId, existing === undefined ? sats : existing + sats)
  }

  const hasPockets = rwaPockets.length > 0
  const hasDistributions = strategyTotals.size > 0

  if (!hasPockets && !hasDistributions) {
    return (
      <DashCard
        title="RWA strategy allocation"
        subtitle="Mining yield per strategy"
        className="h-full"
      >
        <PanelState title="No strategy allocation data available." />
      </DashCard>
    )
  }

  const rows = hasPockets
    ? rwaPockets.map((p) => {
        const key = p.label ?? p.pocket
        const totalSats = strategyTotals.get(key)
        return {
          id: p.pocket,
          label: key,
          targetBps: p.targetBps,
          actualBps: p.actualBps,
          enabled: p.enabled,
          totalSats: totalSats === undefined ? 0 : totalSats,
        }
      })
    : Array.from(strategyTotals.entries()).map(([strategyId, totalSats]) => ({
        id: strategyId,
        label: strategyId,
        targetBps: null,
        actualBps: null,
        enabled: true,
        totalSats,
      }))

  return (
    <DashCard
      title="RWA strategy allocation"
      subtitle="Mining yield per strategy"
      className="h-full"
      contentClassName={PANEL_SLOT_CLASS.table}
      action={<Badge color="neutral">{`${rows.length}`}</Badge>}
    >
      <AdminTable>
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Strategy</TableHeader>
            <TableHeader className={tableCol.numeric}>Target</TableHeader>
            <TableHeader className={tableCol.numeric}>Actual</TableHeader>
            <TableHeader className={tableCol.numeric}>BTC received</TableHeader>
            <TableHeader className={tableCol.status}>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={tableCol.primary}>{row.label}</TableCell>
              <TableCell className={tableCol.numeric}>
                {row.targetBps !== null
                  ? formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })
                  : '—'}
              </TableCell>
              <TableCell className={tableCol.numeric}>
                {row.actualBps !== null
                  ? formatPercent(row.actualBps, { fromBps: true, maximumFractionDigits: 2 })
                  : '—'}
              </TableCell>
              <TableCell className={tableCol.numeric}>
                {row.totalSats > 0 ? `${satsToBtc(String(row.totalSats))} BTC` : '—'}
              </TableCell>
              <TableCell className={tableCol.status}>
                {row.enabled ? (
                  <span className="inline-flex rounded-full bg-success-400/10 px-2 py-0.5 text-xs font-medium text-success-400">
                    enabled
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-fg-tertiary/10 px-2 py-0.5 text-xs font-medium text-fg-tertiary">
                    disabled
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>
    </DashCard>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

type PageProps = {
  readonly searchParams: Promise<{ readonly [key: string]: string | string[] | undefined }>
}

function buildVaultOptions(pockets: readonly RwaPocket[]): readonly MiningVaultOption[] {
  return pockets
    .filter((p) => p.enabled)
    .sort((a, b) => (a.label ?? a.pocket).localeCompare(b.label ?? b.pocket))
    .map((p) => ({ id: p.pocket, label: p.label ?? p.pocket }))
}

export default async function Page({ searchParams }: PageProps) {
  await requireSession()
  const params = await searchParams
  const selectedStrategy = typeof params.strategy === 'string' && params.strategy !== '' ? params.strategy : null

  const [miningRes, btcRes] = await Promise.all([
    callBackend<MiningAggregate>('mining'),
    callBackend<BtcAggregate>('btc'),
  ])

  const mining = miningRes.ok ? miningRes.data : null
  const btc = btcRes.ok ? btcRes.data : null

  const hashrate = mining?.hashrate?.value?.reportedHashrateTh ?? null
  const btcEarnedSats = mining?.hashrate?.value?.totalBtcEarnedSats ?? null
  const btcPrice = btc?.btcProduced?.value?.currentPriceUsdc ?? null
  const machineCount = mining?.operationalTelemetry?.value?.machineCount ?? null
  const activeMachines = mining?.operationalTelemetry?.value?.activeMachines ?? null
  const electricityCost = mining?.electricity?.value?.monthlyCost ?? null
  const kwhConsumed = mining?.electricity?.value?.kwhConsumed ?? null
  const costPerKwh = mining?.electricity?.value?.costPerKwh ?? null

  const [distRes, calcRes, rwaRes] = await Promise.all([
    callBackend<{
      readonly distributions: Resolved<readonly DistributionRecord[]>
    }>('mining-distributions'),
    callBackend<{
      readonly calculations: Resolved<readonly CalculationRecord[]>
    }>('mining-calculations'),
    callBackend<{
      readonly pockets: Resolved<readonly RwaPocket[]>
    }>('rwa-vault'),
  ])

  const allDistributions = distRes.ok && distRes.data.distributions.value ? distRes.data.distributions.value : []
  const allCalculations = calcRes.ok && calcRes.data.calculations.value ? calcRes.data.calculations.value : []
  const rwaPockets = rwaRes.ok && rwaRes.data.pockets.value ? rwaRes.data.pockets.value : []

  const vaultOptions = buildVaultOptions(rwaPockets)
  const validStrategy = selectedStrategy && vaultOptions.some((v) => v.id === selectedStrategy) ? selectedStrategy : null

  const distributions = validStrategy
    ? allDistributions.filter((d) => d.rwaStrategyId === validStrategy)
    : allDistributions
  const calculations = validStrategy
    ? allCalculations.filter((c) => c.rwaStrategyId === validStrategy)
    : allCalculations
  const filteredPockets = validStrategy
    ? rwaPockets.filter((p) => p.pocket === validStrategy)
    : rwaPockets

  const nextDistribution = distributions.find((d) => d.status === 'pending') ?? null
  const history = distributions.filter((d) => d.status !== 'pending')

  const nextPeriod = nextDistribution?.month ?? new Date().toISOString().slice(0, 7)
  const defaultStrategyId = validStrategy ?? nextDistribution?.rwaStrategyId ?? vaultOptions[0]?.id ?? 'rwa_mining'

  const btcAmount = satsToBtc(btcEarnedSats)
  const yieldValue = btcValueUsdc(btcEarnedSats, btcPrice)

  // Hero KPI band (cockpit header) — hashrate is the dominant fact, the other
  // readings support it. Same titles, values, and units as the former strip.
  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'hashrate',
      title: 'Hashrate',
      value: kpiReading(
        mining?.hashrate,
        hashrate !== null ? `${formatNumber(Number(hashrate))} TH/s` : null,
      ),
      unit: 'reported',
      icon: CpuChipIcon,
    },
    {
      id: 'btc-earned',
      title: 'BTC earned',
      value: kpiReading(mining?.hashrate, btcAmount !== null ? `${btcAmount} BTC` : null),
      unit: 'cumulative',
      icon: CircleStackIcon,
    },
    {
      id: 'yield',
      title: 'Yield value',
      value: kpiReading(btc?.btcProduced, yieldValue),
      unit: 'USDC',
      icon: BanknotesIcon,
    },
    {
      id: 'machines',
      title: 'Machines',
      value: kpiReading(
        mining?.operationalTelemetry,
        machineCount !== null && activeMachines !== null
          ? `${activeMachines} / ${machineCount}`
          : null,
      ),
      unit: 'active',
      icon: BoltIcon,
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <AdminPageHeader
        title="Mining operations"
        description="Manage hashrate, OPEX, and yield distribution to RWA strategy."
        kpis={kpis}
      />

      {vaultOptions.length > 0 ? (
        <div className={clsx(surfaceInset, 'flex items-center justify-between gap-4 p-3')}>
          <MiningVaultSwitcher options={vaultOptions} selectedId={validStrategy} />
          {validStrategy ? (
            <span className="text-xs text-fg-tertiary">
              Showing data for <span className="font-medium text-fg">{validStrategy}</span>
            </span>
          ) : (
            <span className="text-xs text-fg-tertiary">Showing all RWA strategies</span>
          )}
        </div>
      ) : null}

      {/*
        Rows whose heights MATCH by construction. Row A: the fleet card owns the
        height, the keeper flank chains h-full and pins its button to the shared
        bottom edge. Row B: symmetric pair, both h-full. Row D: the calculations
        table is a FROZEN slot, the next-distribution flank scrolls inside the
        same track. Row E: two tables on ONE frozen slot height — equal at any
        row count. No voids, nothing stretches with the dataset.
      */}
      {/* Row A — fleet telemetry + keeper action flank. */}
      <BentoGrid>
        <BentoCard span={8} className="h-full">
          <MachineFleetSection
            machineCount={machineCount}
            activeMachines={activeMachines}
            averageUptimePct={mining?.operationalTelemetry?.value?.averageUptimePct ?? null}
          />
        </BentoCard>
        <BentoCard span={4} className="h-full">
          <ReportMetricsSection />
        </BentoCard>
      </BentoGrid>

      {/* Row B — OPEX + yield: symmetric halves. */}
      <BentoGrid>
        <BentoCard span={6} className="h-full">
          <OpexSection
            monthlyCost={electricityCost}
            kwhConsumed={kwhConsumed}
            costPerKwh={costPerKwh}
          />
        </BentoCard>
        <BentoCard span={6} className="h-full">
          <YieldCalculationSection
            btcEarnedSats={btcEarnedSats}
            btcPrice={btcPrice}
            electricityCost={electricityCost}
          />
        </BentoCard>
      </BentoGrid>

      {/* Row C — monthly production: frameless header + bare ChartFrame band. */}
      <MonthlyBtcChart distributions={distributions} />

      {/* Row D — calculation history (frozen table) + next distribution flank. */}
      <BentoGrid>
        <BentoCard span={8} className="h-full">
          <CalculationsSection
            calculations={calculations}
            nextPeriod={nextPeriod}
            defaultStrategyId={defaultStrategyId}
          />
        </BentoCard>
        <BentoCard span={4} className="h-full">
          <NextDistributionCard distribution={nextDistribution} />
        </BentoCard>
      </BentoGrid>

      {/* Row E — distribution history + strategy allocation: paired frozen tables. */}
      <BentoGrid>
        <BentoCard span={8} className="h-full">
          <DistributionHistory distributions={history} />
        </BentoCard>
        <BentoCard span={4} className="h-full">
          <StrategyAllocationSection
            distributions={distributions}
            rwaPockets={filteredPockets}
          />
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
