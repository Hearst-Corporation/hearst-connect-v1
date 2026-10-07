'use client'

import { useState, type ReactNode } from 'react'
import './user-dashboard.css'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ChartPieIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  GiftIcon,
  LockClosedIcon,
  PresentationChartLineIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { AdminHeroTitle } from '@/components/admin/typography'
import { HearstExposureRadial } from '@/components/charts'
import { ReserveCompositionChart, type ReserveSplitPoint } from '@/features/admin-dashboard/book-charts'
import { ExportButtons } from '@/components/admin/paginated-table'
import { EndOfTermChoice, InvestMoreButton, WithdrawButton, type WithdrawWallet } from '@/features/client-portal/controls'
import type { PortalActivity, PortalOverview, PortalReward, PortalVault } from '@/features/client-portal/load'
import { formatBtc, formatDate } from '@/lib/format'
import { available, signalOf, unavailable, valueOf, type Availability } from '@/lib/vaults/model'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { DottedH } from '@/assets/brand/dotted-h'
import { StatTile } from './stat-tile'
import { BreakdownFlank } from './breakdown-flank'
import { MiningEconomicsFlank } from './mining-economics-flank'
import { ComputeFleetPanel } from './compute-fleet-panel'
import { MovementTimeline } from './movement-timeline'
import { HearstAllocationStackChart } from '@/components/charts/richart/allocation-stack-chart'
import { DistributionsDonut } from './distributions-donut'
import { BtcPositionHeadline } from './btc-position'
import { ClientTabs } from '@/features/admin-clients/client-tabs'
import type { Distribution, UserDashboard, UserMovement } from './load'

/**
 * MY VAULT — l'écran que le client ouvre, dans l'ordre où il le lit :
 *
 *   1. Sa position : toute sa réserve en bitcoin, mesurée contre un simple
 *      achat — et « Invest more ».
 *   2. Son vault (un par versement, sélecteur s'il en a plusieurs) : ce qu'il
 *      a produit, ce qui est retirable, retiré, le dernier reward, le blocage.
 *   3. Comment il travaille : allocation | parc (sa puissance, les cubes),
 *      construction de la réserve, cours | ce que coûte un bitcoin miné.
 *   4. L'exposition par poche, puis sa fin de blocage.
 *   5. Ses mouvements et ses distributions — ceux de CE vault.
 *
 * Chaque chiffre client vient du livre du vault, le même que lit l'admin ; le
 * contexte (marché, réseau, parc) vient des lectures communes.
 */

type CentralView = 'compute' | 'reserve' | 'allocation'

const CENTRAL_VIEWS: readonly { key: CentralView; label: string; icon: typeof CpuChipIcon }[] = [
  { key: 'compute', label: 'Compute', icon: CpuChipIcon },
  { key: 'reserve', label: 'Reserve', icon: ChartBarIcon },
  { key: 'allocation', label: 'Allocation', icon: ChartPieIcon },
]

const MOVE_TITLE: Record<string, string> = {
  deposit: 'Deposit',
  reward: 'Monthly reward',
  withdrawal: 'Withdrawal',
  release: 'Reserve released',
}
const MOVE_ICON_KEY: Record<string, string> = { deposit: 'deposit', reward: 'distribution', withdrawal: 'withdraw', release: 'withdraw' }
const MOVE_STATUS: Record<string, string> = { pending: 'Pending', processing: 'Processing', declined: 'Declined' }
/** Un mouvement réglé : « Received » pour un versement, « Sent » pour le reste. */
const settledStatus = (type: string, status: string) =>
  MOVE_STATUS[status] ?? (type === 'deposit' ? 'Received' : 'Sent')

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const usdc = (n: number) => `${Math.round(n).toLocaleString('en-US')} USDC`
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function seriesState(a: Availability<unknown>, has: boolean, empty: string, missing: string): SeriesState {
  if (a.kind === 'unavailable') return { type: 'unavailable', explanation: missing }
  if (!has) return { type: 'empty', explanation: empty }
  return { type: 'plotted' }
}

export type VaultTab = 'overview' | 'compute' | 'capital' | 'activity'

export type ClientVaultProps = Readonly<{
  tab: VaultTab
  data: UserDashboard
  overview: PortalOverview
  vault: PortalVault
  rewards: readonly PortalReward[]
  activity: readonly PortalActivity[] | null
  wallets: readonly WithdrawWallet[]
  reserve: readonly ReserveSplitPoint[]
}>

export function UserDashboardView({ tab, data, overview, vault, rewards, activity, wallets, reserve }: ClientVaultProps) {
  const [central, setCentral] = useState<CentralView>('compute')
  const [kind, setKind] = useState<'all' | 'reward' | 'withdrawal' | 'deposit'>('all')
  const [scope, setScope] = useState<'vault' | 'all'>('vault')
  const { totals, spotUsd } = overview
  const live = available(true, { provenance: 'chain' })
  const sig = signalOf(live)
  const released = vault.status === 'RELEASED'

  // ── Position : toute la réserve, tous vaults confondus ─────────────────────
  const since = [...overview.vaults].map((v) => v.lockupStartAt).sort()[0] ?? null
  const activeCount = overview.vaults.filter((v) => v.status === 'ACTIVE').length
  /* Ce que chaque bitcoin du client lui a coûté : ses dépôts, rapportés à tout
     le bitcoin qu'ils ont produit — gardé ou déjà retiré. Le minage le fait
     baisser mois après mois ; c'est la mesure du produit, en un prix. */
  const ownedBtc = totals.reserveBtc + totals.withdrawnBtc
  const avgCost = ownedBtc > 0 ? totals.depositedUsdc / ownedBtc : null
  const nextReward =
    overview.vaults
      .map((v) => v.nextRewardAt)
      .filter((x): x is string => x !== null)
      .sort()[0] ?? null

  // ── Vault ────────────────────────────────────────────────────────────────
  const credited = rewards.filter((r) => r.status !== 'pending' && r.status !== 'declined')
  const lastReward = [...credited].sort((a, b) => b.month.localeCompare(a.month))[0] ?? null
  const withdrawnUsdAtPayout = (activity ?? [])
    .filter((a) => a.vault === vault.label && a.type === 'withdrawal' && a.status !== 'declined' && a.status !== 'pending')
    .reduce((t, a) => t + a.usd, 0)
  const withdrawnShare = vault.capitalBtc > 0 ? vault.withdrawnBtc / vault.capitalBtc : null
  const monthsLeft = Math.max(0, vault.lockupMonths - vault.elapsedMonths)

  // ── Mouvements et distributions de CE vault ─────────────────────────────
  const scoped = (activity ?? []).filter(
    (a) =>
      (scope === 'all' || a.vault === vault.label) &&
      (kind === 'all' || a.type === kind || (kind === 'withdrawal' && a.type === 'release')),
  )
  const inFlight = (activity ?? []).filter((a) => a.type === 'withdrawal' && (a.status === 'pending' || a.status === 'processing'))
  const moves: UserMovement[] = scoped
    .map((a) => ({
      id: a.id,
      title: scope === 'all' && overview.vaults.length > 1 ? `${MOVE_TITLE[a.type] ?? a.type} · ${a.vault}` : (MOVE_TITLE[a.type] ?? a.type),
      detail: MOVE_ICON_KEY[a.type] ?? null,
      txHash: a.txHash,
      amountUsdc: a.usd,
      occurredAt: a.at,
      btc: a.btc,
      status: settledStatus(a.type, a.status),
    }))
  const distributions: Distribution[] = rewards
    .filter((r) => r.status !== 'declined')
    .map((r) => ({
      id: `${r.vaultId}:${r.month}`,
      month: r.month,
      paidAt: null,
      amountUsdc: r.usd,
      btcAmount: r.btc,
      btcPriceUsd: r.priceUsd,
      status: r.status === 'distributed' ? 'distributed' : r.status === 'approved' ? 'approved' : 'pending',
    }))

  // ── Panneau central ──────────────────────────────────────────────────────
  const fleet = valueOf(data.fleet)
  const allocationTime = valueOf(data.allocationSeries)
  /* Ce que chaque bucket a rapporté à CE vault depuis l'entrée, en bitcoin. */
  const earned = ['Mining Alpha', 'Bitcoin Lending', 'USDC Yield'].map((bucket, i) => ({
    bucket,
    color: ['#9eea7a', '#6b6b6b', '#a9a9a9'][i],
    btc: credited.reduce((t, r) => t + (r.pockets.find((p) => p.bucket === bucket)?.btc ?? 0), 0),
  }))
  const earnedTotal = earned.reduce((t, e) => t + e.btc, 0)
  const reserveSource = available(reserve, { provenance: 'chain' })
  const views: Record<CentralView, { question: string; unit: string; state: SeriesState; node: ReactNode; source: Availability<unknown> }> = {
    compute: {
      question: 'Compute infrastructure',
      unit: 'your share and the fleet behind it',
      state: seriesState(data.fleet, fleet !== null, 'No fleet is reporting capacity yet.', 'Awaiting a verified fleet source.'),
      node: fleet !== null ? <ComputeFleetPanel fleet={fleet} networkHashrateEhs={valueOf(data.productionCost)?.hashrateEhs ?? null} /> : null,
      source: data.fleet,
    },
    reserve: {
      question: 'How your reserve was built',
      unit: 'bought at entry + produced since · BTC',
      state: seriesState(reserveSource, reserve.length > 0, 'Your reserve starts with your first deposit.', ''),
      node: (
        <div className="center-reserve">
          <ReserveCompositionChart points={reserve} breakdownTitle="Reserve by vault" wide />
        </div>
      ),
      source: reserveSource,
    },
    allocation: {
      question: 'Vault composition',
      unit: 'share of vault by bucket · and what each one earned',
      state: seriesState(
        data.allocationSeries,
        allocationTime !== null && allocationTime.length > 1,
        'Allocation history is not deep enough to plot yet.',
        'Awaiting a verified allocation source.',
      ),
      node:
        allocationTime !== null ? (
          <div className="center-allocation">
            <HearstAllocationStackChart points={[...allocationTime]} viewport="hero" />
            <ul className="bucket-earned" aria-label="Earned by each bucket">
              {earned.map((e) => (
                <li key={e.bucket}>
                  <span className="bucket-earned-name">
                    <i style={{ background: e.color }} aria-hidden="true" />
                    {e.bucket}
                  </span>
                  <span className="bucket-earned-value">+{formatBtc(e.btc)}</span>
                  <span className="bucket-earned-share">
                    {earnedTotal > 0 ? `${((e.btc / earnedTotal) * 100).toFixed(0)} % of what your vault earned` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      source: data.allocationSeries,
    },
  }
  const active = views[central]
  const exposure = valueOf(data.exposure)

  return (
    <MotionConfig reducedMotion="user">
      <>

        <div className="vault-tabs-row">
          <ClientTabs
            tabs={[
              { id: 'overview', label: 'Overview', badge: 0 },
              { id: 'compute', label: 'Compute & mining', badge: 0 },
              { id: 'capital', label: 'Capital & lockup', badge: 0 },
              { id: 'activity', label: 'Movements', badge: vault.pendingWithdrawalBtc > 0 ? 1 : 0 },
            ]}
            active={tab}
            base={`/account?vault=${encodeURIComponent(vault.vaultId)}`}
          />
          <div className="vault-tabs-actions">
            {overview.vaults.length > 1 ? (
              <nav aria-label="Vaults" className="ud-seg flex-wrap">
                {overview.vaults.map((v) => (
                  <Link
                    key={v.vaultId}
                    href={`/account?vault=${encodeURIComponent(v.vaultId)}&tab=${tab}`}
                    scroll={false}
                    className={`ud-seg-btn no-underline${v.vaultId === vault.vaultId ? ' active' : ''}`}
                  >
                    {v.label}
                  </Link>
                ))}
              </nav>
            ) : null}
            {released ? null : (
              <WithdrawButton
                vaults={[{ vaultId: vault.vaultId, label: vault.label, availableBtc: vault.availableBtc }]}
                wallets={wallets}
                spotUsd={spotUsd}
                className="vault-action vault-action--primary"
              />
            )}
          </div>
        </div>

        <div className={`vault-tab-body vault-tab-body--${tab}`}>
        {/* ── 1. La position ─────────────────────────────────────────────── */}
        {tab === 'overview' ? (
        <section id="position" className="your-position" aria-label="Your position">
          <div className="section-heading position-heading">
            <div className="position-heading-text">
              <p className="eyebrow">Your position</p>
              <h2>Bitcoin Strategic Reserve</h2>
              <span>
                Everything in bitcoin — {activeCount} vault{activeCount === 1 ? '' : 's'} open, one per deposit.
              </span>
            </div>
            <InvestMoreButton ownerName={overview.owner.name} className="position-deposit-cta" />
          </div>
          <BtcPositionHeadline
            positionBtc={available({ btc: totals.reserveBtc, rateUsd: spotUsd, source: 'derived' as const }, { provenance: 'chain' })}
            vsHodl={available(
              {
                heldBtc: totals.reserveBtc + totals.withdrawnBtc,
                hodlBtc: totals.capitalBtc,
                deltaPct: totals.capitalBtc > 0 ? ((totals.reserveBtc + totals.withdrawnBtc) / totals.capitalBtc - 1) * 100 : 0,
                entryRateUsd: 0,
                spotRateUsd: spotUsd,
                windowLabel: 'since your first deposit',
              },
              { provenance: 'chain' },
            )}
            note={`${formatBtc(totals.capitalBtc)} bought with your deposits + ${formatBtc(totals.producedBtc)} added by the buckets · ≈ ${usd(totals.valueUsd)}`}
            terms={[
              {
                label: 'Deposited',
                value: usdc(totals.depositedUsdc),
                icon: ScaleIcon,
                signal: sig,
                footnote: `${overview.vaults.length} vault${overview.vaults.length === 1 ? '' : 's'} · client since ${since ? formatDate(since) : '—'}`,
              },
              {
                label: 'Your price per bitcoin',
                value: avgCost !== null ? usd(avgCost) : '—',
                icon: CurrencyDollarIcon,
                signal: sig,
                footnote:
                  avgCost !== null
                    ? `${usd(spotUsd)} on the market today · ${Math.round((1 - avgCost / spotUsd) * 100)} % below`
                    : null,
              },
              {
                label: 'Next reward',
                value: nextReward ? formatDate(nextReward) : '—',
                icon: CalendarDaysIcon,
                signal: sig,
                footnote: overview.lastReward
                  ? `last: ${formatBtc(overview.lastReward.btc)} for ${monthLabel(overview.lastReward.month)}`
                  : 'after your first full month',
              },
            ]}
          />
        </section>
        ) : null}

        {/* ── 2. Le vault ───────────────────────────────────────────────── */}
        {tab !== 'activity' ? (
        <section id="vault" className="fund-vault" aria-label="Your vault">
          {tab === 'overview' ? (
          <div className="section-heading vault-heading">
            <div className="vault-heading-text">
              <p className="eyebrow">Your vault</p>
              <h2>{vault.label}</h2>
              <span>
                {usd(vault.principalUsdc)} deposited {formatDate(vault.lockupStartAt)} · converted at {usd(vault.entryRateUsd)} / BTC
              </span>
            </div>
          </div>
          ) : null}

          {tab === 'overview' ? (
          <section className="fund-kpis" aria-label="Vault indicators">
            <StatTile
              icon={BitcoinIcon}
              tone="accent"
              label="Produced for your vault"
              value={formatBtc(vault.producedBtc)}
              signal={sig}
              footnote={`≈ ${usd(vault.producedBtc * spotUsd)} at today’s price`}
            />
            <StatTile
              icon={ArrowDownTrayIcon}
              label="Available to withdraw"
              value={formatBtc(vault.availableBtc)}
              aside={`≈ ${usd(vault.availableBtc * spotUsd)}`}
              signal={sig}
              footnote={vault.pendingWithdrawalBtc > 0 ? `${formatBtc(vault.pendingWithdrawalBtc)} being withdrawn` : 'ready now'}
            />
            <StatTile
              icon={ArrowUpTrayIcon}
              label="Withdrawn to date"
              value={formatBtc(vault.withdrawnBtc)}
              aside={withdrawnUsdAtPayout > 0 ? `≈ ${usd(withdrawnUsdAtPayout)} received` : null}
              signal={sig}
              meter={withdrawnShare}
              footnote={withdrawnShare !== null ? `${(withdrawnShare * 100).toFixed(1)} % of the bitcoin bought at entry` : null}
            />
            <StatTile
              icon={GiftIcon}
              label="Last reward"
              value={lastReward ? formatBtc(lastReward.btc) : '—'}
              signal={sig}
              footnote={
                released
                  ? 'vault closed'
                  : lastReward
                    ? `credited for ${monthLabel(lastReward.month)}`
                    : 'after the first full month'
              }
            />
            <StatTile
              icon={LockClosedIcon}
              label="Capital locked"
              value={released ? 'Released' : `${monthsLeft} of ${vault.lockupMonths}`}
              signal={sig}
              meter={vault.elapsedMonths / Math.max(1, vault.lockupMonths)}
              footnote={released ? 'returned to you in bitcoin' : `months remaining · unlocks ${formatDate(vault.lockupEndAt)}`}
            />
            <div className="position-grid-mark" aria-hidden="true">
              <DottedH className="position-grid-mark-svg" />
            </div>
          </section>
          ) : null}

          {/* ── 3. Comment il travaille ─────────────────────────────────── */}
          {tab === 'compute' ? (
          <section id="compute" className="analysis analysis--fund" aria-label="Vault analysis">
            <BreakdownFlank
              title="Vault Allocation"
              hint="Your capital by pocket"
              icon={ChartPieIcon}
              availability={data.allocationBars}
              kind="percent"
              unit="%"
              centerCaption="allocated"
            />

            <div className="center">
              <div className="center-panel">
                <select
                  className="chart-switch-select"
                  aria-label="Vault chart"
                  value={central}
                  onChange={(e) => setCentral(e.target.value as CentralView)}
                >
                  {CENTRAL_VIEWS.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <div className="chart-switch" role="group" aria-label="Vault chart">
                  {CENTRAL_VIEWS.map((v) => {
                    const Icon = v.icon
                    const selected = central === v.key
                    return (
                      <button
                        key={v.key}
                        type="button"
                        aria-pressed={selected}
                        className={selected ? 'active' : undefined}
                        onClick={() => setCentral(v.key)}
                      >
                        {selected ? <motion.span layoutId="ud-central-pill" className="switch-pill" aria-hidden="true" /> : null}
                        <span className="switch-inner">
                          <Icon className="size-4" aria-hidden="true" />
                          {v.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
                <div className="center-head">
                  <h2>{active.question}</h2>
                  <span>{active.unit}</span>
                  {signalOf(active.source) === 'live' ? (
                    <span className="fresh-badge" data-signal="live">
                      Live
                    </span>
                  ) : null}
                </div>
                <div className="center-plot">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={central}
                      className="center-plot-inner"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                    >
                      {active.state.type === 'plotted' ? (
                        active.node
                      ) : (
                        <div className={`center-state${active.state.type === 'unavailable' ? ' is-bad' : ''}`}>
                          <span className="empty-mark" />
                          <p>{active.state.explanation}</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <MiningEconomicsFlank cost={data.productionCost} hashprice={valueOf(data.marketSnapshot)?.hashprice ?? null} />
          </section>
          ) : null}

          {/* ── 4. L'exposition, puis l'échéance ────────────────────────── */}
          {tab === 'capital' ? (
          <>
          <section id="exposure" className="exposure-cap" aria-label="Strategy exposure">
            <div className="ec-panel">
              <div className="ec-heading">
                <h2>
                  <PresentationChartLineIcon className="size-4" aria-hidden="true" />
                  Strategy Exposure
                </h2>
                <span>Target vs actual · % of vault · each bucket’s protocol and current rate</span>
              </div>
              <div className="ec-body">
                {exposure !== null ? (
                  <HearstExposureRadial
                    items={[...exposure]}
                    aumUsdc={vault.principalUsdc}
                    briefs={Object.fromEntries(
                      vault.pockets.map((p) => {
                        const target = exposure.find((e) => e.label === p.name)?.targetPct
                        return [p.name, target === undefined ? p.protocol : `${p.protocol} · target ${Math.round(target)} %`]
                      }),
                    )}
                    yields={valueOf(data.bucketYields)}
                    expanded
                    center={(() => {
                      const band = vault.allocation.bandBps / 100
                      const ok = exposure.every((e) => e.actualPct === null || Math.abs(e.actualPct - e.targetPct) <= band)
                      return ok
                        ? { value: 'On target', label: `all within ±${band} pt`, ok }
                        : { value: 'Rebalancing', label: `beyond ±${band} pt`, ok }
                    })()}
                  />
                ) : null}
                <p className="rebalance-line">
                  <CheckCircleIcon className="size-4" aria-hidden="true" />
                  Beyond ±{vault.allocation.bandBps / 100} pt from target, Hearst rebalances back — only between your buckets, every move approved
                  and recorded.
                </p>
              </div>
            </div>
          </section>

          {released ? null : (
            <section id="lockup" className="exposure-cap" aria-label="End of lockup">
              <div className="ec-panel">
                <div className="ec-heading">
                  <h2>
                    <CalendarDaysIcon className="size-4" aria-hidden="true" />
                    At the end of the lockup
                  </h2>
                  <span>Tell us now — you can change your mind until {formatDate(vault.lockupEndAt)}</span>
                </div>
                <div className="ec-body term-choice">
                  <div className="term-choice-track">
                    <div className="term-choice-labels">
                      <span>
                        Month {vault.elapsedMonths} of {vault.lockupMonths}
                      </span>
                      <span>Unlocks {formatDate(vault.lockupEndAt)}</span>
                    </div>
                    <div className="term-choice-bar">
                      <span style={{ width: `${Math.min(100, (vault.elapsedMonths / Math.max(1, vault.lockupMonths)) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="term-choice-side">
                    <EndOfTermChoice vaultId={vault.vaultId} value={vault.endOfTerm} />
                    <p className="term-choice-note">Receive {formatBtc(vault.reserveBtc)} to your whitelisted wallet, or renew at that day’s price.</p>
                  </div>
                </div>
              </div>
            </section>
          )}
          </>
          ) : null}
        </section>
        ) : null}

        {/* ── 5. Les mouvements ─────────────────────────────────────────── */}
        {tab === 'activity' ? (
        <section id="activity" className="your-account" aria-label="Your movements">
          <div className="section-heading movements-toolbar">
            <div>
              <p className="eyebrow">Your account</p>
              <h2>Capital Activity</h2>
              <span>Every deposit, monthly reward and withdrawal — in bitcoin, with its status.</span>
            </div>
            <div className="movements-filters">
              {overview.vaults.length > 1 ? (
                <div className="ud-seg" role="group" aria-label="Vaults">
                  {(
                    [
                      ['vault', vault.label],
                      ['all', 'All vaults'],
                    ] as const
                  ).map(([id, label]) => (
                    <button key={id} type="button" className={`ud-seg-btn${scope === id ? ' active' : ''}`} onClick={() => setScope(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="ud-seg" role="group" aria-label="Type">
                {(
                  [
                    ['all', 'All'],
                    ['reward', 'Rewards'],
                    ['withdrawal', 'Withdrawals'],
                    ['deposit', 'Deposits'],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" className={`ud-seg-btn${kind === id ? ' active' : ''}`} onClick={() => setKind(id)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Un retrait en cours se suit ici, étape par étape. */}
          {inFlight.length > 0 ? (
            <div className="withdrawal-track">
              {inFlight.map((a) => (
                <div key={a.id} className="withdrawal-track-row">
                  <p>
                    Withdrawal in progress · <strong>{formatBtc(a.btc)}</strong> from {a.vault}
                    {a.destination ? ` to ${a.destination}` : ''}
                  </p>
                  <ol>
                    {(a.steps ?? []).map((st, i) => (
                      <li key={st.label} className={st.done ? 'is-done' : undefined}>
                        <span>{st.done ? '✓' : i + 1}</span>
                        {st.label}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          ) : null}

          <div className="your-account-body">
            <section className="movements" aria-label="Your movements">
              <div className="movements-heading">
                <div>
                  <h2>
                    <ArrowsRightLeftIcon className="size-4" aria-hidden="true" />
                    Your Movements
                  </h2>
                  <span className="movements-sub">Newest first</span>
                </div>
                <span>Verified data only · {moves.length} total</span>
              </div>
              <MovementTimeline
                key={`${scope}:${kind}`}
                availability={activity === null ? unavailable() : available(moves, { provenance: 'chain' })}
                btcSpotUsd={spotUsd}
                actions={
                  <ExportButtons
                    data={{
                      filename: 'hearst-activity',
                      title: 'Capital activity',
                      columns: ['Date', 'Type', 'Vault', 'BTC', 'USD', 'Status', 'Transaction'],
                      data: scoped.map((a) => [a.at.slice(0, 10), a.type, a.vault, a.btc, Math.round(a.usd), a.status, a.txHash]),
                    }}
                  />
                }
              />
            </section>
            <DistributionsDonut distributions={available(distributions, { provenance: 'chain' })} />
          </div>
        </section>
        ) : null}
        </div>
      </>
    </MotionConfig>
  )
}
