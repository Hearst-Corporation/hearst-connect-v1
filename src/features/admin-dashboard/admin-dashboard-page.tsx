import {
  DashCard,
  DashboardHeader,
  DashboardShell,
  MarketSnapshotPanel,
  PanelFallback,
  PanelHeaderLink,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { HearstPrimaryAction } from '@/components/actions'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { PendingStrip } from '@/features/admin-approvals/pending-strip'
import { AlertsPanel } from './alerts-panel'
import { AuditList } from '@/features/settings/audit-list'
import { loadAudit } from '@/lib/settings/load'
import { ApprovalsQueue } from '@/features/admin-approvals/approvals-queue'
import { DecisionsDisclosure } from '@/features/admin-approvals/decisions-disclosure'
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
  loadAdminMarketSnapshot,
} from '@/lib/admin-dashboard/load'
import { formatCurrency, formatNumber } from '@/lib/format'
import { available, isAvailable, mapAvailability, valueOf, type Availability } from '@/lib/vaults/model'
import { Suspense, type ReactNode } from 'react'
import { HearstBreakdownDonut } from '@/components/charts'
import {
  ReserveCompositionChart,
  type ReserveSplitPoint,
} from './book-charts'
import {
  reserveByClientKind,
  type CapitalSlice,
} from './capital-breakdowns'
import { PipelineStrip } from './pipeline-strip'
import { UnlockSchedule } from './unlock-schedule'
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
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
  /* Le résumé par type, puis la file complète — ses boutons sont ici : il n'y
     a plus de page « Decisions » à part. */
  return (
    <>
      <PendingStrip approvals={approvals} vaults={vaults} />
      <DecisionsDisclosure count={valueOf(approvals)?.length ?? 0}>
        <ApprovalsQueue approvals={approvals} />
      </DecisionsDisclosure>
    </>
  )
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



async function PipelineData() {
  const offers = await loadAdminOffers()
  return <PipelineStrip offers={offers} />
}



async function MarketData() {
  const market = await loadAdminMarketSnapshot()
  return <MarketSnapshotPanel snapshot={market} />
}


/**
 * LE DASHBOARD — un centre de commande, pas une vitrine.
 *
 *   1. Les chiffres de tête, et à qui appartient le capital.
 *   2. Le marché, en une ligne.
 *   3. Ce qui ATTEND (décisions) à côté de ce qui ALERTE (dérive, fin de
 *      blocage, intégration en panne, réglage en attente, gardien).
 *   4. La réserve des clients dans le temps, à côté du calendrier des sorties.
 *   5. Le pipeline commercial, à côté de ce que l'équipe vient de faire.
 *
 * Ce qui a son écran n'est plus répété ici : le parc et sa répartition vivent
 * dans Settlement et sur la fiche client, la liste des vaults dans Clients.
 */
export function AdminDashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<PanelFallback label="Loading portfolio…" />}>
        <HeaderData />
      </Suspense>

      {/* Le marché, en une bande : le contexte du coût de minage et des rewards. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <DashPanel eyebrow="Readings" title="Market" subtitle="Bitcoin price, hashprice and network difficulty">
            <Suspense fallback={<PanelFallback />}>
              <MarketData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* Ce qui attend un geste, à côté de ce qui alerte. */}
      <BentoGrid>
        <BentoCard span={8} bare>
          <DashPanel
            eyebrow="Decisions"
            title="Waiting on you"
            subtitle="Deposits, rewards, withdrawals and rebalancings that need a decision"
          >
            <Suspense fallback={<PanelFallback />}>
              <PendingDecisions />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashPanel eyebrow="Alerts" title="Needs attention" subtitle="Not a decision — but not to be discovered by chance">
            <Suspense fallback={<PanelFallback />}>
              <AlertsPanel />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* La réserve des clients dans le temps, et quand elle peut sortir. */}
      <BentoGrid>
        <BentoCard span={8} bare>
          <DashPanel
            eyebrow="Reserves"
            title="Client bitcoin reserves"
            subtitle="What the deposits bought at entry, and what the product has added since"
            action={<PanelHeaderLink href="/admin/settlement">Settlement</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <ReserveHistoryData />
            </Suspense>
          </DashPanel>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashPanel eyebrow="Liquidity" title="Unlock schedule" subtitle="When each client's bitcoin reserve can leave" fill>
            <Suspense fallback={<PanelFallback />}>
              <UnlockScheduleData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>

      {/* L'amont commercial, et ce que l'équipe vient de faire. */}
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
            title="What the team did"
            subtitle="From the audit log"
            action={<PanelHeaderLink href="/admin/settings/audit">Audit log</PanelHeaderLink>}
          >
            <Suspense fallback={<PanelFallback />}>
              <TeamActivityData />
            </Suspense>
          </DashPanel>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}

/** Les derniers gestes de l'équipe, lus dans le journal d'audit. */
async function TeamActivityData() {
  const audit = await loadAudit(7)
  return <AuditList entries={audit} compact />
}
