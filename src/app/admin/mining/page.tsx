import { AdminPageHeader } from '@/components/admin/page-header'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { DataTableShell, SectionCard } from '@/components/compositions'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/format'
import { requireSession } from '@/lib/auth'
import {
  CpuChipIcon,
  BoltIcon,
  CircleStackIcon,
  BanknotesIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { ApproveButton } from './approve-button'
import { MonthlyBtcChart } from './monthly-btc-chart'
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

/* ── Sections ────────────────────────────────────────────────────────────── */

function MiningKpis({
  hashrate,
  btcEarnedSats,
  btcPrice,
  machineCount,
  activeMachines,
  electricityCost,
}: Readonly<{
  hashrate: string | null
  btcEarnedSats: string | null
  btcPrice: string | null
  machineCount: number | null
  activeMachines: number | null
  electricityCost: string | null
}>) {
  const btcAmount = satsToBtc(btcEarnedSats)
  const yieldValue = btcValueUsdc(btcEarnedSats, btcPrice)

  const kpis = [
    {
      id: 'hashrate',
      title: 'Hashrate',
      value: hashrate !== null ? `${formatNumber(Number(hashrate))} TH/s` : '—',
      unit: 'reported',
      icon: CpuChipIcon,
    },
    {
      id: 'btc-earned',
      title: 'BTC earned',
      value: btcAmount !== null ? `${btcAmount} BTC` : '—',
      unit: 'cumulative',
      icon: CircleStackIcon,
    },
    {
      id: 'yield',
      title: 'Yield value',
      value: yieldValue !== null ? yieldValue : '—',
      unit: 'USDC',
      icon: BanknotesIcon,
    },
    {
      id: 'machines',
      title: 'Machines',
      value:
        machineCount !== null && activeMachines !== null
          ? `${activeMachines} / ${machineCount}`
          : '—',
      unit: 'active',
      icon: BoltIcon,
    },
  ] as const

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <div className="flex items-center gap-2">
            <kpi.icon className="size-5 text-accent-400" />
            <span className="text-xs font-medium text-fg-tertiary">{kpi.title}</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-ink dark:text-fg">
            {kpi.value}
          </p>
          {kpi.unit ? <p className="text-xs text-fg-tertiary">{kpi.unit}</p> : null}
        </div>
      ))}
    </div>
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
      <SectionCard title="OPEX" hint="Operational expenses">
        <Text>Electricity data unavailable.</Text>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="OPEX" hint="Operational expenses">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">Monthly electricity</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {monthlyCost !== null ? formatCurrency(monthlyCost, { decimals: 0 }) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">kWh consumed</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {kwhConsumed !== null ? formatNumber(Number(kwhConsumed), { maximumFractionDigits: 0 }) : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">Cost per kWh</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
            {costPerKwh !== null ? formatCurrency(costPerKwh, { decimals: 2 }) : '—'}
          </p>
        </div>
      </div>
    </SectionCard>
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
    <SectionCard title="Yield calculation" hint="Gross vs net for RWA distribution">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">Gross yield</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-accent-400">
            {grossYield ?? '—'}
          </p>
        </div>
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">OPEX deduction</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-danger-400">
            {electricityCost ? `-${formatCurrency(electricityCost, { decimals: 0 })}` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <p className="text-xs font-medium text-fg-tertiary">Net yield to RWA</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-success-400">
            {netYield ?? '—'}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-fg-tertiary">
        Net yield = gross BTC value minus electricity OPEX. This is the amount available for monthly
        distribution to the RWA strategy.
      </p>
    </SectionCard>
  )
}

function NextDistributionCard({
  distribution,
}: Readonly<{
  distribution: DistributionRecord | null
}>) {
  if (distribution === null) {
    return (
      <SectionCard title="Next distribution" hint="Upcoming monthly yield">
        <Text>No pending distribution scheduled.</Text>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Next distribution"
      hint={`Scheduled for ${formatDateTime(distribution.distributionDate)}`}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
            <p className="text-xs font-medium text-fg-tertiary">BTC amount</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
              {satsToBtc(distribution.btcAmountSats) ?? '—'} BTC
            </p>
          </div>
          <div className="rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
            <p className="text-xs font-medium text-fg-tertiary">Value at price</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-ink dark:text-fg">
              {btcValueUsdc(distribution.btcAmountSats, distribution.btcPriceUsdc) ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-console-inset p-4 ring-1 ring-console-line-soft">
          <div>
            <p className="text-xs font-medium text-fg-tertiary">Target strategy</p>
            <p className="text-sm font-medium text-ink dark:text-fg">{distribution.rwaStrategyId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-fg-tertiary">Status</p>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                distribution.status === 'approved'
                  ? 'bg-success-400/10 text-success-600 dark:text-success-400'
                  : distribution.status === 'distributed'
                    ? 'bg-accent-400/10 text-accent-600 dark:text-accent-400'
                    : 'bg-warning-400/10 text-warning-600 dark:text-warning-400'
              }`}
            >
              {distribution.status}
            </span>
          </div>
        </div>
        {distribution.status === 'pending' ? <ApproveButton distributionId={distribution.id} /> : null}
      </div>
    </SectionCard>
  )
}

function DistributionHistory({
  distributions,
}: Readonly<{
  distributions: readonly DistributionRecord[]
}>) {
  if (distributions.length === 0) {
    return (
      <DataTableShell title="Distribution history" calme="No previous distributions recorded." />
    )
  }

  return (
    <DataTableShell title="Distribution history" count={`${distributions.length}`}>
      <TableHead>
        <TableRow>
          <TableHeader className="text-left text-xs">Month</TableHeader>
          <TableHeader className="text-left text-xs">Date</TableHeader>
          <TableHeader className="text-left text-xs">BTC</TableHeader>
          <TableHeader className="text-left text-xs">Value</TableHeader>
          <TableHeader className="text-left text-xs">Strategy</TableHeader>
          <TableHeader className="text-left text-xs">Status</TableHeader>
          <TableHeader className="text-left text-xs">Approved</TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {distributions.map((d) => (
          <TableRow key={d.id}>
            <TableCell className="text-xs">{d.month}</TableCell>
            <TableCell className="text-xs">{formatDateTime(d.distributionDate)}</TableCell>
            <TableCell className="text-xs tabular-nums">
              {satsToBtc(d.btcAmountSats) ?? '—'} BTC
            </TableCell>
            <TableCell className="text-xs tabular-nums">
              {btcValueUsdc(d.btcAmountSats, d.btcPriceUsdc) ?? '—'}
            </TableCell>
            <TableCell className="text-xs">{d.rwaStrategyId}</TableCell>
            <TableCell className="text-xs">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  d.status === 'approved'
                    ? 'bg-success-400/10 text-success-600 dark:text-success-400'
                    : d.status === 'distributed'
                      ? 'bg-accent-400/10 text-accent-600 dark:text-accent-400'
                      : 'bg-warning-400/10 text-warning-600 dark:text-warning-400'
                }`}
              >
                {d.status}
              </span>
            </TableCell>
            <TableCell className="text-xs">
              {d.approvedAt ? formatDateTime(d.approvedAt) : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTableShell>
  )
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
      <SectionCard title="Calculations" hint="Historical yield calculations">
        <Text>No calculations recorded yet.</Text>
        <div className="mt-4 max-w-xs">
          <TriggerCalculationButton period={nextPeriod} rwaStrategyId={defaultStrategyId} />
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Calculations" hint="Historical yield calculations">
      <DataTableShell title="Calculation history" count={`${calculations.length}`}>
        <TableHead>
          <TableRow>
            <TableHeader className="text-left text-xs">Period</TableHeader>
            <TableHeader className="text-left text-xs">BTC</TableHeader>
            <TableHeader className="text-left text-xs">Gross yield</TableHeader>
            <TableHeader className="text-left text-xs">OPEX</TableHeader>
            <TableHeader className="text-left text-xs">Net yield</TableHeader>
            <TableHeader className="text-left text-xs">Strategy</TableHeader>
            <TableHeader className="text-left text-xs">Calculated</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {calculations.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="text-xs">{c.period}</TableCell>
              <TableCell className="text-xs tabular-nums">
                {satsToBtc(c.btcAmountSats) ?? '—'} BTC
              </TableCell>
              <TableCell className="text-xs tabular-nums">
                {formatCurrency(c.grossYieldUsdc, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-danger-400">
                -{formatCurrency(c.opexDeductionUsdc, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-success-400">
                {formatCurrency(c.netYieldUsdc, { decimals: 0 })}
              </TableCell>
              <TableCell className="text-xs">{c.rwaStrategyId}</TableCell>
              <TableCell className="text-xs">{formatDateTime(c.calculatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
      <div className="mt-4 max-w-xs">
        <TriggerCalculationButton period={nextPeriod} rwaStrategyId={defaultStrategyId} />
      </div>
    </SectionCard>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  await requireSession()

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

  const [distRes, calcRes] = await Promise.all([
    callBackend<{
      readonly distributions: Resolved<readonly DistributionRecord[]>
    }>('mining-distributions'),
    callBackend<{
      readonly calculations: Resolved<readonly CalculationRecord[]>
    }>('mining-calculations'),
  ])

  const allDistributions = distRes.ok && distRes.data.distributions.value ? distRes.data.distributions.value : []
  const allCalculations = calcRes.ok && calcRes.data.calculations.value ? calcRes.data.calculations.value : []

  const nextDistribution = allDistributions.find((d) => d.status === 'pending') ?? null
  const history = allDistributions.filter((d) => d.status !== 'pending')

  const nextPeriod = nextDistribution?.month ?? new Date().toISOString().slice(0, 7)
  const defaultStrategyId = nextDistribution?.rwaStrategyId ?? 'rwa_mining'

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Mining operations"
        description="Manage hashrate, OPEX, and yield distribution to RWA strategy."
        kpis={[]}
      />

      <MiningKpis
        hashrate={hashrate}
        btcEarnedSats={btcEarnedSats}
        btcPrice={btcPrice}
        machineCount={machineCount}
        activeMachines={activeMachines}
        electricityCost={electricityCost}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <OpexSection
          monthlyCost={electricityCost}
          kwhConsumed={kwhConsumed}
          costPerKwh={costPerKwh}
        />
        <YieldCalculationSection
          btcEarnedSats={btcEarnedSats}
          btcPrice={btcPrice}
          electricityCost={electricityCost}
        />
      </div>

      <MonthlyBtcChart distributions={allDistributions} />

      <CalculationsSection
        calculations={allCalculations}
        nextPeriod={nextPeriod}
        defaultStrategyId={defaultStrategyId}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <NextDistributionCard distribution={nextDistribution} />
        <DistributionHistory distributions={history} />
      </div>
    </div>
  )
}
