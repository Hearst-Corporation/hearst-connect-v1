import { DashboardHeader, DashCard, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import { chartTheme, categoricalColor } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import { miningNoteServer, type ScenarioKey, type VsHoldingResult } from '@/lib/mining-note'
import { available, unavailable, type Availability } from '@/lib/vaults/model'
import { CircleStackIcon, CpuChipIcon, ScaleIcon, BanknotesIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { MultiLineChart, type ChartSeries } from './multi-line-chart'
import { MonteCarloPanel, SensitivityPanel } from './risk-explorer'

export const metadata: Metadata = { title: 'Mining note' }
export const dynamic = 'force-dynamic'

/** Default scenario for the server-rendered cards (document §4 example). */
const DEFAULT_REQ = { capital: 1_000_000, btcPriceStart: 100_000, months: 24 } as const

const SCENARIO_ORDER: readonly ScenarioKey[] = ['flat', 'btc100k', 'btc150k', 'btc200k', 'worst50']
const SCENARIO_LABEL: Record<ScenarioKey, string> = {
  flat: 'Flat',
  btc100k: 'BTC $100k',
  btc150k: 'BTC $150k',
  btc200k: 'BTC $200k',
  worst50: 'Worst −50%',
}

function usdCompact(v: number): string {
  return `$${formatNumber(v, { notation: 'compact', maximumFractionDigits: 1 })}`
}

function usd(v: number | null): string {
  if (v === null) return '—'
  return `$${formatNumber(v, { maximumFractionDigits: 0 })}`
}

function fracPct(v: number | null): string {
  if (v === null) return '—'
  return `${formatNumber(v * 100, { maximumFractionDigits: 1 })}%`
}

export default async function MiningNotePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const capital = Number(params.capital ?? DEFAULT_REQ.capital)
  const btcPriceStart = Number(params.btcPriceStart ?? DEFAULT_REQ.btcPriceStart)
  const months = Number(params.months ?? DEFAULT_REQ.months)
  const req = {
    capital: Number.isFinite(capital) && capital > 0 ? capital : DEFAULT_REQ.capital,
    btcPriceStart: Number.isFinite(btcPriceStart) && btcPriceStart > 0 ? btcPriceStart : DEFAULT_REQ.btcPriceStart,
    months: Number.isFinite(months) && months >= 6 && months <= 60 ? months : DEFAULT_REQ.months,
  }

  const [projectionsR, scenariosR, vsHoldingR] = await Promise.allSettled([
    miningNoteServer.projections(),
    miningNoteServer.scenarios(),
    miningNoteServer.vsHolding(req),
  ])

  const projections = projectionsR.status === 'fulfilled' ? projectionsR.value.scenarios : null
  const scenarios = scenariosR.status === 'fulfilled' ? scenariosR.value : null
  const vsHolding = vsHoldingR.status === 'fulfilled' ? vsHoldingR.value : null

  const kpis: ReadonlyArray<{
    id: string
    title: string
    value: Availability<string>
    unit?: string
    icon: typeof CpuChipIcon
  }> = [
    {
      id: 'source',
      title: 'Engine',
      value:
        projections !== null
          ? available('Connected', { provenance: 'live' })
          : unavailable({ reason: 'Engine unreachable', endpoint: '/api/mining-note/projections', status: 'UNAVAILABLE' }),
      icon: CpuChipIcon,
    },
    ...(vsHolding !== null
      ? [
          {
            id: 'alpha',
            title: 'Mining vs holding α',
            value: available(usdCompact(vsHolding.summary.finalAlphaUsd), { provenance: 'live' }),
            icon: ScaleIcon,
          },
          {
            id: 'mined',
            title: 'Total BTC mined',
            value: available(formatNumber(vsHolding.summary.totalBtcMined, { maximumFractionDigits: 2 }), { provenance: 'live' }),
            unit: 'BTC',
            icon: CircleStackIcon,
          },
          {
            id: 'elec',
            title: 'Electricity paid',
            value: available(usdCompact(vsHolding.summary.costBasis.totalElecPaid), { provenance: 'live' }),
            icon: BanknotesIcon,
          },
        ]
      : []),
  ]

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Mining note"
        description={`Simulations from the vault-v2 engine · capital ${usd(req.capital)} · start ${usd(req.btcPriceStart)} · ${req.months} months`}
        kpis={kpis}
      />

      {projections === null && scenarios === null && vsHolding === null ? (
        <PanelState
          title="Mining-note engine unreachable"
          detail={`Set MINING_NOTE_API_URL (currently ${process.env.MINING_NOTE_API_URL ?? 'http://localhost:3105'}) and start the nextjs-vault-server. No fallback values are shown.`}
          status="UNAVAILABLE"
        />
      ) : (
        <BentoGrid>
          {/* ── Preset comparison — dominant card, full monthly series ──────── */}
          <BentoCard span={8}>
            <DashCard
              title="Preset scenarios"
              subtitle="Note value per month for the five engine presets"
              className="h-full"
            >
              {scenarios === null ? (
                <PanelState title="Scenarios unavailable" detail="Engine returned an error for /scenarios." status="UNAVAILABLE" />
              ) : (
                <MultiLineChart
                  unit="USD"
                  series={SCENARIO_ORDER.map((key, i): ChartSeries => {
                    const result = scenarios[key]
                    return {
                      id: key,
                      label: SCENARIO_LABEL[key],
                      color: categoricalColor(i),
                      points: result.months.map((m) => ({ month: m.month, value: m.noteValue })),
                    }
                  })}
                  valueStyle="compact-dollar"
                />
              )}
            </DashCard>
          </BentoCard>

          {/* ── Projections table — the bounded flank ───────────────────────── */}
          <BentoCard span={4}>
            <DashCard
              title="Projections"
              subtitle="Preset exits, whole-USD"
              className="h-full"
            >
              {projections === null ? (
                <PanelState title="Projections unavailable" status="UNAVAILABLE" />
              ) : (
                <AdminTable>
                  <TableHead>
                    <TableRow>
                      <TableHeader className={tableCol.hash}>Scenario</TableHeader>
                      <TableHeader className={tableCol.numeric}>Net releasable</TableHeader>
                      <TableHeader className={tableCol.numeric}>Return</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projections.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className={tableCol.numeric}>{usd(p.netReleasable)}</TableCell>
                        <TableCell className={tableCol.numeric}>
                          <span className={p.returnPct >= 0 ? 'text-success-400' : 'text-danger-400'}>
                            {p.returnPct >= 0 ? '+' : ''}
                            {formatNumber(p.returnPct, { maximumFractionDigits: 1 })}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </AdminTable>
              )}
            </DashCard>
          </BentoCard>

          {/* ── Mining vs holding — dominant comparison + cost-basis flank ──── */}
          <BentoCard span={8}>
            <DashCard
              title="Mining vs. buying BTC"
              subtitle="Note value against a same-capital BTC purchase"
              className="h-full"
            >
              {vsHolding === null ? (
                <PanelState title="Comparison unavailable" status="UNAVAILABLE" />
              ) : (
                <VsHoldingChart vsHolding={vsHolding} />
              )}
            </DashCard>
          </BentoCard>

          <BentoCard span={4}>
            <DashCard
              title="Cost basis"
              subtitle="What the note's BTC really cost"
              className="h-full"
            >
              {vsHolding === null ? (
                <PanelState title="Cost basis unavailable" status="UNAVAILABLE" />
              ) : (
                <CostBasisList vsHolding={vsHolding} />
              )}
            </DashCard>
          </BentoCard>

          {/* ── Risk — explicit-run Monte-Carlo and sensitivity ─────────────── */}
          <BentoCard span={8}>
            <DashCard
              title="Monte-Carlo risk"
              subtitle="500 GBM paths — bands are BTC price, KPIs are note value"
              className="h-full"
            >
              <MonteCarloPanel />
            </DashCard>
          </BentoCard>

          <BentoCard span={4}>
            <DashCard
              title="Sensitivity"
              subtitle="11 drifts × 9 volatilities — 99 runs"
              className="h-full"
              contentClassName="overflow-x-auto"
            >
              <SensitivityPanel />
            </DashCard>
          </BentoCard>
        </BentoGrid>
      )}
    </div>
  )
}

/* ── Sub-views ────────────────────────────────────────────────────────────── */

function VsHoldingChart({ vsHolding }: Readonly<{ vsHolding: VsHoldingResult }>) {
  const { miningWins } = vsHolding.summary
  const series: ChartSeries[] = [
    {
      id: 'mining',
      label: `Mining note ${miningWins ? '— wins' : '— loses'}`,
      color: chartTheme.dataSeries.brandPrimary,
      points: vsHolding.months.map((m) => ({ month: m.month, value: m.mining.noteValueUsd })),
    },
    {
      id: 'holding',
      label: 'Buy & hold BTC',
      color: chartTheme.dataSeries.dataReference,
      dashed: true,
      points: vsHolding.months.map((m) => ({ month: m.month, value: m.holding.valueUsd })),
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-xs text-fg-tertiary">
        <span className={miningWins ? 'font-semibold text-success-400' : 'font-semibold text-danger-400'}>
          Mining {miningWins ? 'outperforms' : 'underperforms'} holding
        </span>{' '}
        by {fracPct(vsHolding.summary.finalAlphaPct)} ({usdCompact(vsHolding.summary.finalAlphaUsd)})
        {vsHolding.summary.breakEvenMonth !== null
          ? ` — breakeven month ${vsHolding.summary.breakEvenMonth}`
          : ''}
        {' '}· BTC terms: {formatNumber(vsHolding.summary.finalAlphaBtc, { maximumFractionDigits: 2 })} BTC.
      </p>
      <MultiLineChart unit="USD" series={series} valueStyle="compact-dollar" />
    </div>
  )
}

function CostBasisList({ vsHolding }: Readonly<{ vsHolding: VsHoldingResult }>) {
  const cb = vsHolding.summary.costBasis
  const rows: ReadonlyArray<{ label: string; value: string; tone?: 'accent' }> = [
    { label: 'Cash cost per mined BTC (elec only)', value: `${fracPct(cb.allInDiscountVsAvgSpotPct)} vs avg spot` === '—' ? usd(cb.miningCashCostPerBtcAvg) : usd(cb.miningCashCostPerBtcAvg) },
    { label: 'All-in cost per mined BTC', value: usd(cb.allInCostPerMinedBtc), tone: 'accent' },
    { label: 'Blended cost per BTC held', value: usd(cb.blendedCostPerBtcHeld) },
    { label: 'Hold entry price', value: `$${formatNumber(cb.holdEntryPrice, { maximumFractionDigits: 0 })}` },
    { label: 'Avg spot over the horizon', value: `$${formatNumber(cb.avgSpotPrice, { maximumFractionDigits: 0 })}` },
    { label: 'All-in discount vs avg spot', value: fracPct(cb.allInDiscountVsAvgSpotPct) },
    { label: 'Capex machines', value: usdCompact(cb.capexMachines) },
    { label: 'Buyback recovered', value: usdCompact(cb.buybackRecovered) },
    { label: 'Electricity paid', value: usdCompact(cb.totalElecPaid) },
  ]

  return (
    <dl className="flex flex-col divide-y divide-console-line-soft">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-xs text-fg-secondary">{r.label}</dt>
          <dd
            className={
              r.tone === 'accent'
                ? 'text-sm font-semibold text-accent-400 tabular-nums'
                : 'text-sm font-medium text-fg tabular-nums'
            }
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
