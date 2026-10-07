import {
  ActivityTimelinePanel,
  DashCard,
  DashboardHeader,
  DashboardShell,
  MarketSnapshotPanel,
  PanelFallback,
  PanelHeaderLink,
  PortfolioExposurePanel,
  RebalancingAlertsPanel,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { HearstPrimaryAction } from '@/components/actions'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { PendingStrip } from '@/features/admin-approvals/pending-strip'
import {
  loadAdminApprovals,
  loadAdminOffers,
  loadAdminProductionCost,
  loadAdminVaultRegistry,
  loadAdminMiningDistributions,
} from '@/lib/admin-dashboard/load'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import type { ProductionCost } from '@/lib/product/readings'
import {
  loadAdminExposure,
  loadAdminMarketSnapshot,
  loadAdminRebalancingSummary,
  loadAdminRecentActivity,
  loadAdminAssetScale,
} from '@/lib/admin-dashboard/load'
import { formatCurrency, formatDriftPts, formatNumber } from '@/lib/format'
import { available, isAvailable, mapAvailability, type Availability } from '@/lib/vaults/model'
import { Suspense, type ReactNode } from 'react'
import { HearstBreakdownDonut } from '@/components/charts'
import {
  ReserveCompositionChart,
  BucketsByMonthChart,
  type BucketMonth,
  type ReserveSplitPoint,
} from './book-charts'
import {
  reserveByClientKind,
  type CapitalSlice,
} from './capital-breakdowns'
import { ComputeFleetPanel } from '@/features/user-dashboard/compute-fleet-panel'
import { allocatedTo, computeByVault, loadFleetCompute } from '@/lib/mining/compute'
import { ComputeByVault } from './compute-by-vault'
import { PipelineStrip } from './pipeline-strip'
import { UnlockSchedule } from './unlock-schedule'
import { VaultWatchlist } from './vault-watchlist'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  BoltIcon,
} from '@heroicons/react/16/solid'

function unavailableReason(bloc: Availability<unknown>, fallback: string): string {
  return bloc.kind === 'unavailable' ? (bloc.reason ?? fallback) : fallback
}

// Order = hierarchy: AUM is the dominant fact, then drift (pilotage angle:
// how much, and is it drifting).
/** Décisions en attente, chargées à part : le bandeau ne bloque pas le reste. */
async function PendingDecisions() {
  const [approvals, vaults] = await Promise.all([loadAdminApprovals(), loadAdminVaultRegistry()])
  return <PendingStrip approvals={approvals} vaults={vaults} />
}

/**
 * Les quatre chiffres de tête, en bandeau pleine largeur.
 *
 * Ce que le produit gère, ce qu'il a produit, à quel prix, et sur combien de
 * vaults. Le coût de minage est le cœur de la thèse — on acquiert du bitcoin
 * sous le cours, et c'est cet écart qui fait le produit.
 *
 * Pas de jauge : une barre sous un montant ne dit rien de plus que la note
 * qui l'accompagne. Le contexte passe par une ligne de texte.
 */
function dashboardKpis(
  cost: Availability<ProductionCost>,
  vaults: Availability<readonly AdminVaultRecord[]>,
): readonly DashboardKpi[] {
  /* Les réserves des clients, en bitcoin : leurs versements convertis à
     l'entrée, plus ce que les trois poches ont rapporté et qui a été converti
     mois après mois. */
  const book = isAvailable(vaults) ? vaults.value : null
  const capitalSats = book?.reduce((t, v) => t + (v.capitalBtcSats ?? 0), 0) ?? null
  const accumulatedSats = book?.reduce((t, v) => t + (v.accruedBtcSats ?? 0), 0) ?? null
  const depositsUsd = book?.reduce((t, v) => t + (v.principalUsdc ?? 0), 0) ?? null
  const btc2 = (sats: number) => formatNumber(sats / 1e8, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const c = isAvailable(cost) ? cost.value : null

  const costRatio = c !== null && c.marketPriceUsd > 0 ? c.costPerBtcUsd / c.marketPriceUsd : null

  /* L'AUM, en DOLLARS : la valeur actuelle des réserves des clients au cours
     du jour. Le seul chiffre de tête en USD — c'est celui qu'on annonce
     dehors ; tout le reste se lit en bitcoin. */
  const reserveBtc = ((capitalSats ?? 0) + (accumulatedSats ?? 0)) / 1e8
  const aumUsd = c !== null && book !== null ? reserveBtc * c.marketPriceUsd : null

  return [
    {
      id: 'aum',
      title: 'Assets under management',
      value:
        aumUsd === null
          ? mapAvailability(vaults, () => '—')
          : available(formatCurrency(String(Math.round(aumUsd)), { unit: '$', fromAtomic: 1 })),
      icon: BanknotesIcon,
      footnote:
        aumUsd !== null && depositsUsd !== null && c !== null
          ? `Client reserves at $${formatNumber(c.marketPriceUsd, { maximumFractionDigits: 0 })} / BTC · ${formatCurrency(String(Math.round(depositsUsd)), { unit: '$', fromAtomic: 1 })} deposited`
          : null,
    },
    {
      id: 'reserves',
      title: 'Client bitcoin reserves',
      value: book === null ? mapAvailability(vaults, () => '—') : available(btc2((capitalSats ?? 0) + (accumulatedSats ?? 0))),
      unit: 'BTC',
      icon: BanknotesIcon,
      footnote:
        // Le détail dépôts / accumulé est dans le graphe « Client bitcoin reserves », plus bas.
        book !== null ? `Across ${book.length} client vault${book.length === 1 ? '' : 's'}` : null,
    },
    {
      id: 'cost',
      title: 'Cost to mine one BTC',
      value: mapAvailability(cost, (v) =>
        formatCurrency(String(Math.round(v.costPerBtcUsd)), { unit: '$', fromAtomic: 1 }),
      ),
      /* Pas de cours à côté : il figure déjà plus bas dans la page. Seul
         l'écart au marché reste, en note — c'est la marge du produit. */
      icon: ArrowTrendingUpIcon,
      footnote:
        costRatio !== null && costRatio < 1
          ? `${formatNumber((1 - costRatio) * 100, { maximumFractionDigits: 0 })}% under market`
          : null,
    },
    {
      /* LA PROMESSE DU PRODUIT : combien de bitcoin en plus de ce que les
         dépôts auraient acheté au comptant à l'entrée. C'est la comparaison
         « vs simply holding » que le client lit sur /account. */
      id: 'vs-hodl',
      title: 'Ahead of simply holding',
      value:
        book === null
          ? mapAvailability(vaults, () => '—')
          : available(
              capitalSats !== null && capitalSats > 0
                ? `+${formatNumber(((accumulatedSats ?? 0) / capitalSats) * 100, { maximumFractionDigits: 1 })} %`
                : '—',
            ),
      icon: BoltIcon,
      footnote: `${btc2(accumulatedSats ?? 0)} BTC more than the deposits bought at entry`,
    },
  ]
}

/**
 * Fixed panel slots (content area, px) — the box is FROZEN whether data is
 * loading, absent, or plotted; taller content scrolls inside the box. The
 * values are row-matched: [exposure + alerts] + gap == timeline card, so
 * row A's two columns end on the same line at any data state.
 *   exposure 304 + alerts 188 + gap 24 + 3×header 76 == timeline 592 + 76.
 */
const PANEL_SLOT_CLASS = {
  exposure: 'h-[304px] overflow-y-auto scrollbar-none',
  signal: 'h-[188px] overflow-y-auto scrollbar-none',
  timeline: 'h-[592px] overflow-hidden',
} as const

type PanelSlot = keyof typeof PANEL_SLOT_CLASS

function DashPanel({
  title,
  eyebrow,
  subtitle,
  action,
  slot,
  tone,
  fill,
  children,
}: Readonly<{
  title: string
  /** Le surtitre en capitales — de quoi le bloc relève. */
  eyebrow?: string
  /* Chaque bloc porte une phrase qui dit CE QU'IL MONTRE, comme sur /account
     (« Mining Economics » / « What producing one BTC costs »). Un titre seul
     nomme un sujet sans dire ce qu'on en lit. */
  subtitle?: string
  action?: ReactNode
  slot?: PanelSlot
  tone?: 'accent'
  /** La carte prend toute la hauteur de sa rangée, contenu centré. */
  fill?: boolean
  children: ReactNode
}>) {
  return (
    <DashCard
      className={fill ? 'h-full min-w-0' : 'min-w-0'}
      contentClassName={
        slot !== undefined ? PANEL_SLOT_CLASS[slot] : fill ? 'flex-1 justify-center' : 'flex-1'
      }
      title={title}
      eyebrow={eyebrow}
      subtitle={subtitle}
      action={action}
      tone={tone}
    >
      {children}
    </DashCard>
  )
}

/* ── Streaming data panels ───────────────────────────────────────────────────
   Each panel awaits its own read model; the React-cache fetchers in
   `lib/admin-dashboard/cache` dedupe shared endpoints across panels, so
   streaming costs no extra backend calls. */

async function HeaderData() {
  const [cost, vaults] = await Promise.all([
    loadAdminProductionCost(),
    loadAdminVaultRegistry(),
  ])
  return (
    <DashboardHeader
      tone="neutral"
      kpis={dashboardKpis(cost, vaults)}
      /* À côté des chiffres : à qui appartient ce capital. */
      aside={
        <DashPanel eyebrow="Reserves" title="Reserves by client type" subtitle="Whose bitcoin the vaults hold">
          <Suspense fallback={<PanelFallback />}>
            {/* Anneau et légende côte à côte : la carte reste basse, et le
                bandeau de chiffres à sa gauche avec elle. */}
            <CapitalDonut split={reserveByClientKind} caption="in client reserves" layout="side" />
          </Suspense>
        </DashPanel>
      }
      action={
        <HearstPrimaryAction icon={<PlusIcon />} href="/admin/offers/new">
          New offer
        </HearstPrimaryAction>
      }
    />
  )
}

/**
 * Une répartition de l'AUM en donut — le même anneau que /account. Les trois
 * lisent le registre des vaults ; le fetch est dédupliqué par le cache React.
 */
async function CapitalDonut({
  split,
  caption,
  layout,
}: Readonly<{
  split: (vaults: readonly AdminVaultRecord[]) => CapitalSlice[]
  caption: string
  layout?: 'stacked' | 'side'
}>) {
  const vaults = await loadAdminVaultRegistry()
  if (!isAvailable(vaults)) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">The vault registry could not be read.</p>
  }
  return (
    <HearstBreakdownDonut
      slices={split(vaults.value)}
      kind="btc"
      unit="BTC"
      centerCaption={caption}
      layout={layout}
    />
  )
}

/** Le parc et ce qui en revient aux vaults — le panneau de /account, à l'échelle du book. */
async function ComputeData() {
  const fc = await loadFleetCompute()
  const fleet = allocatedTo(fc, 'all')
  const rows = computeByVault(fc)
  if (fleet === null) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">The fleet could not be read.</p>
  }
  const vaults = rows.filter((r) => r.vaultId !== null).length
  return (
    <div className="flex flex-col gap-8">
      <ComputeFleetPanel
        fleet={fleet}
        networkHashrateEhs={fc.networkEhs}
        copy={{
          eyebrow: 'Allocated to client vaults',
          hashrate: `Hashrate allocated, across ${vaults} vaults`,
          produced: 'Produced for the vaults',
          note: 'Each vault holds the machines its Mining capital bought. The rest of the fleet is free for new vaults.',
        }}
      />
      <div>
        <p className="mb-3 text-xs text-fg-tertiary">Distribution by client vault</p>
        <ComputeByVault rows={rows} />
      </div>
    </div>
  )
}

async function UnlockScheduleData() {
  const vaults = await loadAdminVaultRegistry()
  return <UnlockSchedule vaults={vaults} />
}

/** Les réserves des clients en bitcoin, mois par mois, depuis le premier vault. */
async function ReserveHistoryData() {
  const [vaults, distributions] = await Promise.all([loadAdminVaultRegistry(), loadAdminMiningDistributions()])
  if (!isAvailable(vaults)) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">The vault registry could not be read.</p>
  }
  const added = new Map<string, number>()
  // Ce que chaque vault a reçu, mois par mois — pour la réserve de chaque client au survol.
  const addedByVault = new Map<string, Map<string, number>>()
  // Seuls les rewards validés sont dans les réserves : un mois en attente n'y est pas encore.
  for (const d of (isAvailable(distributions) ? distributions.value : []).filter((x) => x.status !== 'pending')) {
    const btc = Number(d.btcAmountSats) / 1e8
    if (Number.isFinite(btc)) added.set(d.month, (added.get(d.month) ?? 0) + btc)
    for (const v of d.byVault ?? []) {
      const m = addedByVault.get(v.vaultId) ?? new Map<string, number>()
      m.set(d.month, (m.get(d.month) ?? 0) + v.btcSats / 1e8)
      addedByVault.set(v.vaultId, m)
    }
  }
  const starts = vaults.value
    .filter((v) => v.lockupStartAt !== null)
    .map((v) => ({ month: (v.lockupStartAt as string).slice(0, 7), btc: (v.capitalBtcSats ?? 0) / 1e8 }))
  const months = [...new Set([...starts.map((x) => x.month), ...added.keys()])].sort()
  if (months.length === 0) return <ReserveCompositionChart points={[]} />
  // Tous les mois, du premier vault à aujourd'hui — sans trou.
  const all: string[] = []
  const d = new Date(`${months[0]}-01T00:00:00Z`)
  const end = months[months.length - 1]
  while (true) {
    const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    all.push(m)
    if (m >= end) break
    d.setUTCMonth(d.getUTCMonth() + 1)
  }
  let accumulated = 0
  const running = new Map<string, number>()
  const points: ReserveSplitPoint[] = all.map((m) => {
    accumulated += added.get(m) ?? 0
    const deposits = starts.filter((x) => x.month <= m).reduce((t, x) => t + x.btc, 0)
    // Par CLIENT : ses tranches (un vault chacune) s'additionnent.
    const perClient = new Map<string, { label: string; value: number }>()
    for (const v of vaults.value) {
      if (v.lockupStartAt === null || (v.lockupStartAt as string).slice(0, 7) > m) continue
      const acc = (running.get(v.vaultId) ?? 0) + (addedByVault.get(v.vaultId)?.get(m) ?? 0)
      running.set(v.vaultId, acc)
      const cur = perClient.get(v.clientId) ?? { label: v.clientLabel, value: 0 }
      perClient.set(v.clientId, { label: cur.label, value: cur.value + (v.capitalBtcSats ?? 0) / 1e8 + acc })
    }
    const byClient = [...perClient.values()].sort((a, b) => b.value - a.value)
    return { month: m, deposits, accumulated, byClient }
  })
  return <ReserveCompositionChart points={points} />
}

/** Ce que chaque poche ajoute aux réserves, mois par mois, tous vaults confondus. */
async function BucketsByMonthData() {
  const distributions = await loadAdminMiningDistributions()
  if (!isAvailable(distributions)) {
    return <p className="py-6 text-center text-sm text-fg-tertiary">Distributions could not be read.</p>
  }
  const months: BucketMonth[] = [...distributions.value]
    .sort((x, y) => x.month.localeCompare(y.month))
    .map((d) => ({
      month: d.month,
      usd: Number(d.yieldUsdc) || 0,
      buckets: Object.fromEntries((d.byBucket ?? []).map((b) => [b.bucket, b.btcSats / 1e8])),
      byClient: (d.byVault ?? [])
        .map((v) => ({ label: v.clientLabel, value: v.btcSats / 1e8 }))
        .sort((a, b) => b.value - a.value),
    }))
  return <BucketsByMonthChart months={months} />
}

async function PortfolioExposureData() {
  const [exposure, assetScale] = await Promise.all([loadAdminExposure(), loadAdminAssetScale()])
  return <PortfolioExposurePanel strategies={exposure} assetScale={assetScale} />
}

async function PipelineData() {
  const offers = await loadAdminOffers()
  return <PipelineStrip offers={offers} />
}

async function VaultWatchlistData() {
  const vaults = await loadAdminVaultRegistry()
  return <VaultWatchlist vaults={vaults} showUnlock={false} />
}

async function RebalancingAlertsData() {
  const rebalancing = await loadAdminRebalancingSummary()
  return <RebalancingAlertsPanel summary={rebalancing} />
}

async function MarketData() {
  const market = await loadAdminMarketSnapshot()
  return <MarketSnapshotPanel snapshot={market} />
}

async function ActivityTimelineData() {
  const [recentActivity, assetScale, vaults] = await Promise.all([
    loadAdminRecentActivity(7),
    loadAdminAssetScale(),
    loadAdminVaultRegistry(),
  ])
  /* Un rééquilibrage concerne UN vault, donc UN client : le flux l'annonçait
     sans nom (« Across the vault »). Le registre dit à qui est ce vault. */
  const clientOf = new Map((isAvailable(vaults) ? vaults.value : []).map((v) => [v.vaultId, v.clientLabel]))
  /* Le backend peut renvoyer plus que demandé : la liste est coupée ici, pour
     que la colonne ne dépasse pas celle des vaults. */
  return (
    <ActivityTimelinePanel
      events={mapAvailability(recentActivity, (events) =>
        events.slice(0, 7).map((e) =>
          e.clientLabel === null && e.vaultId !== null && clientOf.has(e.vaultId)
            ? { ...e, clientLabel: clientOf.get(e.vaultId) ?? null }
            : e,
        ),
      )}
      assetScale={assetScale}
    />
  )
}

/**
 * Admin dashboard — the cockpit FIRST SCREEN.
 *
 * Only what counts at a glance: the four headline figures, the market, what
 * waits on a decision, the commercial pipeline, then each vault against its
 * own threshold beside the ledger.
 *
 * No aggregated drift curve and no event histogram: drift only means
 * something vault by vault, and a count of on-chain events says nothing an
 * operator acts on.
 *
 * Explicit rows, each owning its grid; every panel streams independently
 * behind a Suspense boundary.
 */
export function AdminDashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<PanelFallback label="Loading portfolio…" />}>
        <HeaderData />
      </Suspense>

      {/* Le marché juste sous les chiffres de tête, en aplat vert : c'est le
          contexte qui donne leur sens au coût de minage et au revenu net. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel
            eyebrow="Readings"
            title="Market"
            subtitle="Bitcoin price, hashprice and network difficulty"
            tone="accent"
          >
            <Suspense fallback={<PanelFallback />}>
              <MarketData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* Ce qui ATTEND une décision passe avant les lectures de marché : un
          tableau de bord qui n'annonce pas ce qui bloque laisse l'opérateur
          découvrir les demandes par hasard. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel
            eyebrow="Decisions"
            title="Waiting on you"
            subtitle="Deposits, distributions and withdrawals that need a decision"
          >
            <Suspense fallback={<PanelFallback />}>
              <PendingDecisions />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LE COMPUTE ─────────────────────────────────────────────────────
          Le cœur du produit : la puissance du parc, ce qui en est affecté aux
          vaults, et ce qui reste libre. Le même panneau que voit le client. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel
            eyebrow="Compute"
            title="Compute infrastructure"
            subtitle="The fleet, what is allocated to each client vault, and what is still available"
            action={<PanelHeaderLink href="/admin/settlement">Settlement</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <ComputeData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LE BOOK DANS LE TEMPS ──────────────────────────────────────────
          Comment le capital évolue, et ce que le minage verse chaque mois. */}
      <BentoGrid>
        <BentoCard span={6} bare>
          <DashPanel
            eyebrow="Reserves"
            title="Client bitcoin reserves"
            subtitle="What the deposits bought at entry, and what the product has added since"
          >
            <Suspense fallback={<PanelFallback />}>
              <ReserveHistoryData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={6} bare>
          <DashPanel
            eyebrow="Reserves"
            title="Added each month, by bucket"
            subtitle="What Mining, Lending and USDC added to client reserves, converted into bitcoin"
            action={<PanelHeaderLink href="/admin/settlement">Settlement</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <BucketsByMonthData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LE PIPELINE ────────────────────────────────────────────────────
          Avant toute mesure de ce qui tourne déjà : l'essentiel d'une journée
          est en amont — des offres à finir, à relancer, des fonds à appeler,
          des vaults à ouvrir. Le registre des derniers mouvements l'accompagne. */}
      <BentoGrid>
        <BentoCard span={8} bare>
          <DashPanel
            eyebrow="Commercial"
            title="Pipeline"
            subtitle="Where each prospect stands, and what is waiting on you"
            action={<PanelHeaderLink href="/admin/clients?view=pipeline">Open pipeline</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <PipelineData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashPanel
            eyebrow="Activity"
            title="Recent activity"
            subtitle="The latest movements across all vaults"
            action={<PanelHeaderLink href="/admin/operations">View all activity</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <ActivityTimelineData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* ── LES VAULTS, UN PAR LIGNE ───────────────────────────────────────
          Chaque vault contre SON seuil — on ne rééquilibre jamais « le
          portefeuille », on rééquilibre le vault de quelqu'un. À droite, quand
          ce capital peut sortir. */}
      <BentoGrid>
        <BentoCard span={8} bare>
          <DashPanel
            eyebrow="Clients"
            title="Vaults"
            subtitle="One vault per deposit tranche, each against its own drift threshold"
            action={<PanelHeaderLink href="/admin/clients?view=active">All vaults</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <VaultWatchlistData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        {/* `self-stretch` : la carte prend la hauteur du tableau des vaults. */}
        <BentoCard span={4} bare className="self-stretch">
          <DashPanel
            eyebrow="Liquidity"
            title="Unlock schedule"
            subtitle="When each client's bitcoin reserve can leave — and how much"
            fill
          >
            <Suspense fallback={<PanelFallback />}>
              <UnlockScheduleData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
