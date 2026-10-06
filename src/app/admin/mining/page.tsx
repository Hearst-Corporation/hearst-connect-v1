import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { DashCard, PanelState } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { ProductionCostPanel } from '@/features/user-dashboard/production-cost-panel'
import { loadAdminMarketSnapshot, loadAdminProductionCost } from '@/lib/admin-dashboard/load'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import { requireSession } from '@/lib/auth'
import type { ResolvedStatus } from '@/lib/resolved'
import { available, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import {
  CpuChipIcon,
  BoltIcon,
  CircleStackIcon,
  BanknotesIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import type { MiningVaultOption } from './mining-vault-switcher'
import { FleetMachines, type Machine } from './fleet-machines'
import { MonthlyClose, type CloseMonth } from './monthly-close'
import { MonthlyBtcChart } from './monthly-btc-chart'
import { ElectricityByVault } from './electricity-by-vault'
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
  /** Mirrors the backend `ElectricityStatus` — on-chain elecStatus() read. */
  readonly electricity?: Resolved<{
    monthlyCost: string | null
    payee: string | null
    totalPaid: string | null
    lastPayment: string | null
    nextEligiblePayment: string | null
    canPay: boolean | null
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

/** Mirrors the backend `MiningDistributionItem`. */
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

/** Mirrors the backend `MiningPeriodSummaryItem` — whole-USD strings, sats for BTC. */
type CalculationRecord = {
  readonly id: string
  readonly period: string
  readonly totalBtcMinedSats: string
  readonly avgBtcPrice: string
  readonly grossRevenueUsdc: string
  readonly opexUsdc: string | null
  readonly netYieldUsdc: string
  readonly rwaStrategyId: string
  readonly createdAt: string
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

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


/* ── Sections ────────────────────────────────────────────────────────────── */

/* Même nom que côté client : « Machine fleet » et « Compute Infrastructure »
   désignaient la même chose sous deux vocabulaires. */
/**
 * La déclaration Keeper du parc : ce qui a été déclaré la dernière fois, face à
 * ce que mesure le registre des machines aujourd'hui — l'écart dit s'il faut
 * déclarer à nouveau. Le formulaire part pré-rempli avec le registre.
 */
function ReportMetricsSection({
  reportedThs,
  reportedSats,
  fleetThs,
}: Readonly<{ reportedThs: number | null; reportedSats: number | null; fleetThs: number }>) {
  const gap = reportedThs !== null && reportedThs > 0 ? ((fleetThs - reportedThs) / reportedThs) * 100 : null
  const eh = (ths: number) => `${formatNumber(ths / 1e6, { maximumFractionDigits: 2 })} EH/s`
  return (
    <DashCard
      eyebrow="Keeper"
      title="Report fleet metrics"
      subtitle="What the fleet declares to the backend — a log request, nothing is signed"
    >
      {/* Une bande : ce qui a été déclaré à gauche, la nouvelle déclaration à
          droite — compacte, sans hauteur à combler. */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)]">
          <div className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">Last reported hashrate</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">{reportedThs !== null ? eh(reportedThs) : '—'}</dd>
            <dd className={`text-xs ${gap !== null && Math.abs(gap) > 1 ? 'text-amber-400' : 'text-fg-tertiary'}`}>
              Registry today {eh(fleetThs)}
              {gap !== null ? ` · ${formatNumber(gap, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })} %` : ''}
            </dd>
          </div>
          <div className="flex flex-col gap-1 bg-[var(--ud-card)] px-4 py-3.5">
            <dt className="text-xs text-fg-tertiary">BTC earned, reported</dt>
            <dd className="text-2xl font-medium tabular-nums text-fg">
              {reportedSats !== null ? `${formatBtcValue(reportedSats / 1e8)} BTC` : '—'}
            </dd>
            <dd className="text-xs text-fg-tertiary">Cumulative, since inception</dd>
          </div>
        </dl>
        <div>
          <ReportMetricsButton defaultThs={fleetThs > 0 ? fleetThs : reportedThs} defaultSats={reportedSats} />
        </div>
      </div>
    </DashCard>
  )
}

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

  const [miningRes, btcRes, productionCost] = await Promise.all([
    callBackend<MiningAggregate>('mining'),
    callBackend<BtcAggregate>('btc'),
    // La MÊME lecture que côté client : l'admin la regarde pour piloter, le
    // client pour comprendre ce qu'il détient.
    loadAdminProductionCost(),
  ])

  const mining = miningRes.ok ? miningRes.data : null
  const btc = btcRes.ok ? btcRes.data : null

  const productionCostValue = valueOf(productionCost)
  const hashrate = mining?.hashrate?.value?.reportedHashrateTh ?? null
  const btcEarnedSats = mining?.hashrate?.value?.totalBtcEarnedSats ?? null
  const machineCount = mining?.operationalTelemetry?.value?.machineCount ?? null
  const activeMachines = mining?.operationalTelemetry?.value?.activeMachines ?? null

  /* Le hashprice vient du snapshot marché : la ligne restait vide alors que la
     donnée existe, et le bloc Market du tableau de bord l'affiche. */
  const market = await loadAdminMarketSnapshot()
  const hashpriceRaw = valueOf(market)?.hashprice ?? null
  const hashpriceValue = hashpriceRaw !== null && Number.isFinite(Number(hashpriceRaw)) ? Number(hashpriceRaw) : null

  const [distRes, calcRes, rwaRes, machinesRes, closeRes] = await Promise.all([
    callBackend<{
      readonly distributions: Resolved<readonly DistributionRecord[]>
    }>('mining-distributions'),
    callBackend<{
      readonly calculations: Resolved<readonly CalculationRecord[]>
    }>('mining-calculations'),
    callBackend<{
      readonly pockets: Resolved<readonly RwaPocket[]>
    }>('rwa-vault'),
    callBackend<{ readonly machines: Resolved<readonly Machine[]> }>('mining-machines'),
    callBackend<{ readonly months: Resolved<readonly CloseMonth[]> }>('admin-mining-monthly-close'),
  ])

  const allDistributions = distRes.ok && distRes.data.distributions.value ? distRes.data.distributions.value : []
  const allCalculations = calcRes.ok && calcRes.data.calculations.value ? calcRes.data.calculations.value : []
  const rwaPockets = rwaRes.ok && rwaRes.data.pockets.value ? rwaRes.data.pockets.value : []
  const monthlyClose = closeRes.ok && closeRes.data.months?.value ? closeRes.data.months.value : []
  const machines = machinesRes.ok && machinesRes.data.machines?.value ? machinesRes.data.machines.value : null

  const vaultOptions = buildVaultOptions(rwaPockets)
  const validStrategy = selectedStrategy && vaultOptions.some((v) => v.id === selectedStrategy) ? selectedStrategy : null

  const distributions = validStrategy
    ? allDistributions.filter((d) => d.rwaStrategyId === validStrategy)
    : allDistributions

  const nextDistribution = distributions.find((d) => d.status === 'pending') ?? null

  const nextPeriod = nextDistribution?.month ?? new Date().toISOString().slice(0, 7)
  // No fabricated strategy id: without a real source (selection, pending
  // distribution, or vault pocket), there is no default — the trigger stays off.
  const defaultStrategyId = validStrategy ?? nextDistribution?.rwaStrategyId ?? vaultOptions[0]?.id ?? null

  const uptimePct =
    machines !== null && machines.length > 0 ? machines.reduce((t, m) => t + m.uptime30dPct, 0) / machines.length : null
  /* La part du parc affectée aux vaults des clients — le reste est libre. */
  const fleetThs = (machines ?? []).reduce((t, m) => t + m.hashrateThs, 0)
  const allocatedThs = (machines ?? []).filter((m) => m.vaultId != null).reduce((t, m) => t + m.hashrateThs, 0)
  const allocatedPct = fleetThs > 0 ? (allocatedThs / fleetThs) * 100 : null

  // Hero KPI band (cockpit header) — hashrate is the dominant fact, the other
  // readings support it. Same titles, values, and units as the former strip.
  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'hashrate',
      title: 'Hashrate',
      value: kpiReading(
        mining?.hashrate,
        hashrate !== null ? `${formatNumber(Number(hashrate) / 1e6, { maximumFractionDigits: 2 })} EH/s` : null,
      ),
      unit: 'reported',
      icon: CpuChipIcon,
    },
    {
      /* L'uptime remplace « BTC earned » : le cumul déclaré est déjà dans
         « Report fleet metrics », et la production dans le graphe du parc. */
      id: 'uptime',
      title: 'Uptime, 30 days',
      value: kpiReading(
        mining?.operationalTelemetry,
        uptimePct !== null ? `${formatNumber(uptimePct, { maximumFractionDigits: 1 })} %` : null,
      ),
      unit: 'fleet average',
      icon: CircleStackIcon,
    },
    {
      id: 'allocated',
      title: 'Allocated to client vaults',
      value: kpiReading(
        btc?.btcProduced,
        allocatedPct !== null ? `${formatNumber(allocatedPct, { maximumFractionDigits: 1 })} %` : null,
      ),
      unit: allocatedThs > 0 ? `${formatNumber(allocatedThs / 1000, { maximumFractionDigits: 1 })} PH/s` : undefined,
      icon: BanknotesIcon,
    },
    {
      id: 'machines',
      title: 'Machines',
      value: kpiReading(
        mining?.operationalTelemetry,
        machineCount !== null && activeMachines !== null
          ? `${formatNumber(activeMachines)} / ${formatNumber(machineCount)}`
          : null,
      ),
      unit: 'active',
      icon: BoltIcon,
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Mining operations"
        description="The fleet, its costs, and the bitcoin it pays to each client vault."
        kpis={kpis}
      />


      {/*
        Rows whose heights MATCH by construction. Row A: the fleet card owns the
        height, the keeper flank chains h-full and pins its button to the shared
        bottom edge. Row B: symmetric pair, both h-full. Row D: the calculations
        table is a FROZEN slot, the next-distribution flank scrolls inside the
        same track. Row E: two tables on ONE frozen slot height — equal at any
        row count. No voids, nothing stretches with the dataset.
      */}
      {/* L'économie du minage passe AVANT la télémétrie : savoir combien de
          baisse le produit encaisse commande tout le reste. Ce bloc n'existait
          que côté client, alors que c'est une mesure de pilotage. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            eyebrow="Economics"
            title="Mining economics"
            subtitle="What one bitcoin costs to produce, against the market"
          >
            {productionCostValue !== null ? (
              <ProductionCostPanel
                cost={productionCostValue}
                hashprice={hashpriceValue}
              />
            ) : (
              <PanelState title="Production cost unavailable." />
            )}
          </DashCard>
        </BentoCard>
      </BentoGrid>

      {/* Row A — le parc, machine par machine, sur toute la largeur. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <FleetMachines machines={machines} />
        </BentoCard>
      </BentoGrid>

      {/* Row B — ce que coûte le parc, et l'action Keeper qui déclare sa
          production. Tout ceci est COMMUN : un seul parc pour tous les vaults. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <ElectricityByVault months={monthlyClose} />
        </BentoCard>
      </BentoGrid>
      <BentoGrid>
        <BentoCard span={12} bare>
          <ReportMetricsSection
            reportedThs={hashrate !== null && Number.isFinite(Number(hashrate)) ? Number(hashrate) : null}
            reportedSats={btcEarnedSats !== null && Number.isFinite(Number(btcEarnedSats)) ? Number(btcEarnedSats) : null}
            fleetThs={fleetThs}
          />
        </BentoCard>
      </BentoGrid>

      {/* Row C — la production du parc, avant sa répartition. */}
      <MonthlyBtcChart months={monthlyClose} />

      {/* Row D — LA CLÔTURE DU MOIS, vault par vault : la production et
          l'électricité du parc réparties entre les clients, chacun selon le
          capital de SA poche Mining, et chaque distribution validée pour son
          vault. Remplace cinq blocs qui calculaient un rendement global vers
          une « stratégie » commune — sans dire à quel client allait l'argent. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashCard
            eyebrow="Monthly close"
            title="Split by client vault"
            subtitle="The fleet’s output and electricity, split by each vault’s mining capital — one distribution per client"
          >
            <MonthlyClose
              months={monthlyClose}
              action={
                nextPeriod !== null && defaultStrategyId !== null ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-tertiary">Next to compute: {nextPeriod}</span>
                    <TriggerCalculationButton period={nextPeriod} rwaStrategyId={defaultStrategyId} />
                  </div>
                ) : null
              }
            />
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
