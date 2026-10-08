'use client'

import { useState, type ReactNode } from 'react'
import './user-dashboard.css'
import { accountHref } from './urls'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  BoltIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { AdminHeroTitle } from '@/components/admin/typography'
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
import { BufferPanel } from './buffer-panel'
import { MovementTimeline } from './movement-timeline'
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
 *   3. Comment il travaille (V2, Mining as a Service) : son dépôt (puissance
 *      | buffer) | parc (sa puissance, les cubes), réserve, buffer d'électricité
 *      | ce que coûte un bitcoin miné.
 *   4. Sa fin de blocage.
 *   5. Ses mouvements et ses distributions — ceux de CE vault.
 *
 * Chaque chiffre client vient du livre du vault, le même que lit l'admin ; le
 * contexte (marché, réseau, parc) vient des lectures communes.
 */

type CentralView = 'compute' | 'reserve' | 'buffer'

/* V2 : plus de « Strategy » (poches, cibles, rééquilibrage) — à sa place, le
   buffer qui paie l'électricité. */
const CENTRAL_VIEWS: readonly { key: CentralView; label: string; icon: typeof CpuChipIcon }[] = [
  { key: 'compute', label: 'Compute', icon: CpuChipIcon },
  { key: 'reserve', label: 'Reserve', icon: ChartBarIcon },
  { key: 'buffer', label: 'Buffer', icon: BoltIcon },
]

const MOVE_TITLE: Record<string, string> = {
  deposit: 'Deposit',
  reward: 'Mining of the month',
  withdrawal: 'Withdrawal',
  release: 'Reserve released',
  refill: 'Buffer refill',
  electricity: 'Electricity bill',
}
const MOVE_ICON_KEY: Record<string, string> = {
  deposit: 'deposit',
  reward: 'distribution',
  withdrawal: 'withdraw',
  release: 'withdraw',
  refill: 'refill',
  electricity: 'electricity',
}
const MOVE_STATUS: Record<string, string> = { pending: 'Pending', processing: 'Processing', declined: 'Declined' }
/** Un mouvement réglé : « Received » pour un versement, « Mined » pour le minage
 *  du mois, « Sold » pour le bitcoin vendu pour le buffer, « Paid » pour une facture
 *  d'électricité réglée sur le buffer, « Sent » pour ce qui part vers le wallet. */
const settledStatus = (type: string, status: string) =>
  MOVE_STATUS[status] ??
  (type === 'deposit' ? 'Received' : type === 'reward' ? 'Mined' : type === 'refill' ? 'Sold' : type === 'electricity' ? 'Paid' : 'Sent')

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const usdc = (n: number) => `${Math.round(n).toLocaleString('en-US')} USDC`
const monthLabel = (ym: string) =>
  new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function seriesState(a: Availability<unknown>, has: boolean, empty: string, missing: string): SeriesState {
  if (a.kind === 'unavailable') return { type: 'unavailable', explanation: missing }
  if (!has) return { type: 'empty', explanation: empty }
  return { type: 'plotted' }
}

export type VaultTab = 'overview' | 'compute' | 'activity'

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
  /* Deux sens, pas quatre types : ce qui ENTRE dans la réserve (versements,
     rewards) et ce qui en SORT (retraits, restitution). Un reward n'est pas un
     retrait : il reste dans la réserve tant que le client ne le retire pas. */
  const [kind, setKind] = useState<'all' | 'in' | 'out'>('all')
  const [scope, setScope] = useState<'vault' | 'all'>('vault')
  const { spotUsd } = overview
  /* LA POSITION DU VAULT CHOISI. Le bloc du haut additionnait les vaults
     encore ouverts : sous « Vault 1 » comme sous « Vault 2 », il montrait les
     mêmes chiffres — on croyait lire deux vaults identiques. Le sélecteur
     gouverne maintenant toute la page, ce bloc compris. */
  const totals = {
    reserveBtc: vault.reserveBtc,
    withdrawnBtc: vault.withdrawnBtc,
    capitalBtc: vault.capitalBtc,
    producedBtc: vault.producedBtc,
    depositedUsdc: vault.principalUsdc,
  }
  const multiVault = overview.vaults.length > 1
  const live = available(true, { provenance: 'chain' })
  const sig = signalOf(live)
  const released = vault.status === 'RELEASED'
  // Le vault dans l'URL : son rang, et rien quand le client n'en a qu'un.
  const rank = (id: string) => (overview.vaults.length > 1 ? overview.vaults.findIndex((v) => v.vaultId === id) + 1 : undefined)

  // ── Position : la réserve du vault choisi ─────────────────────────────────
  /* Ce que chaque bitcoin lui a coûté : le dépôt, rapporté à tout le bitcoin
     qu'il a produit — gardé ou déjà retiré. Le minage le fait baisser mois
     après mois ; c'est la mesure du produit, en un prix. */
  const ownedBtc = totals.reserveBtc + totals.withdrawnBtc
  const avgCost = ownedBtc > 0 ? totals.depositedUsdc / ownedBtc : null
  const nextReward = vault.nextRewardAt
  const lastReward =
    [...rewards].filter((r) => r.status === 'distributed').sort((a, b) => b.month.localeCompare(a.month))[0] ?? null

  // ── Vault ────────────────────────────────────────────────────────────────
  const withdrawnUsdAtPayout = (activity ?? [])
    .filter((a) => a.vault === vault.label && a.type === 'withdrawal' && a.status !== 'declined' && a.status !== 'pending')
    .reduce((t, a) => t + a.usd, 0)
  const withdrawnShare = vault.capitalBtc > 0 ? vault.withdrawnBtc / vault.capitalBtc : null
  const monthsLeft = Math.max(0, vault.lockupMonths - vault.elapsedMonths)

  // ── Mouvements et distributions de CE vault ─────────────────────────────
  const scoped = (activity ?? []).filter(
    (a) =>
      (scope === 'all' || a.vault === vault.label) &&
      // In : ce qui entre dans la réserve. Out : ce qui en sort — retraits,
      // recharges du buffer — et l'électricité payée sur le buffer.
      (kind === 'all' || (kind === 'in') === (a.type === 'deposit' || a.type === 'reward')),
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
      // La facture se lit en dollars, payée sur le buffer : pas de bitcoin déduit au cours du jour.
      usdOnly: a.type === 'electricity',
      note: a.type === 'electricity' ? 'from the buffer' : a.type === 'refill' ? 'sold for the buffer' : undefined,
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
  const reserveSource = available(reserve, { provenance: 'chain' })
  const buffer = vault.buffer ?? null
  const bufferSource = buffer !== null ? available(buffer, { provenance: 'chain' }) : unavailable()
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
    buffer: {
      question: 'Electricity buffer',
      unit: 'USDC set aside to pay the fleet’s bills',
      state: seriesState(bufferSource, buffer !== null, 'Your buffer starts with your deposit.', 'Awaiting a verified buffer source.'),
      node: buffer !== null ? <BufferPanel buffer={buffer} /> : null,
      source: bufferSource,
    },
  }
  const active = views[central]

  return (
    <MotionConfig reducedMotion="user">
      <>

        <div className="vault-tabs-row">
          <ClientTabs
            tabs={[
              { id: 'overview', label: 'Overview', badge: 0 },
              { id: 'compute', label: 'Mining', badge: 0 },
              { id: 'activity', label: 'Movements', badge: vault.pendingWithdrawalBtc > 0 ? 1 : 0 },
            ]}
            active={tab}
            href={(id) => accountHref(rank(vault.vaultId), id as VaultTab)}
          />
          <div className="vault-tabs-actions">
            {overview.vaults.length > 1 ? (
              <nav aria-label="Vaults" className="ud-seg flex-wrap">
                {overview.vaults.map((v) => (
                  <Link
                    key={v.vaultId}
                    href={accountHref(rank(v.vaultId), tab)}
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
                {multiVault
                  ? `${vault.label}${released ? ' · returned' : ''} — one of your ${overview.vaults.length} vaults, one per deposit.`
                  : 'Everything in bitcoin — one vault per deposit.'}
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
                windowLabel: multiVault ? 'since this deposit' : 'since your deposit',
              },
              { provenance: 'chain' },
            )}
            // La note retombe sur le chiffre : ce qui est déjà sorti en est retiré.
            note={`${formatBtc(totals.capitalBtc)} deposited + ${formatBtc(totals.producedBtc)} earned${
              totals.withdrawnBtc > 0 ? ` − ${formatBtc(totals.withdrawnBtc)} withdrawn` : ''
            }`}
            terms={[
              {
                label: 'Deposited',
                value: usdc(totals.depositedUsdc),
                icon: ScaleIcon,
                signal: sig,
                footnote: `On ${formatDate(vault.lockupStartAt)} · ${formatBtc(totals.capitalBtc)} at entry`,
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
                value: nextReward ? formatDate(nextReward) : released ? 'None' : '—',
                icon: CalendarDaysIcon,
                signal: sig,
                footnote: released
                  ? 'Vault returned — no more rewards'
                  : lastReward
                    ? `last: ${formatBtc(lastReward.btc)} for ${monthLabel(lastReward.month)}`
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
                {usd(vault.principalUsdc)} on {formatDate(vault.lockupStartAt)} · {usd(vault.entryRateUsd)} / BTC
              </span>
            </div>
            {/* Le choix de fin de blocage vit avec SON vault : visible dès
                l'arrivée, à côté de la tuile « Capital locked ». */}
            {released ? null : (
              <div className="vault-term">
                <span className="vault-term-label">
                  At the end of the lockup
                  <em>you can change until {formatDate(vault.lockupEndAt)}</em>
                </span>
                <EndOfTermChoice vaultId={vault.vaultId} value={vault.endOfTerm} />
              </div>
            )}
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
              footnote={
                released
                  ? 'returned with the reserve'
                  : vault.pendingWithdrawalBtc > 0
                    ? `${formatBtc(vault.pendingWithdrawalBtc)} being withdrawn`
                    : 'ready now'
              }
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
              title="Your deposit"
              hint="Mining power and the electricity buffer"
              icon={ChartPieIcon}
              availability={data.allocationBars}
              kind="percent"
              unit="%"
              centerCaption="deposited"
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

        </section>
        ) : null}

        {/* ── 5. Les mouvements ─────────────────────────────────────────── */}
        {tab === 'activity' ? (
        <section id="activity" className="your-account" aria-label="Your movements">
          <div className="section-heading movements-toolbar">
            <div>
              <p className="eyebrow">Your account</p>
              <h2>Capital Activity</h2>
              <span>Every deposit, month of mining, buffer refill, electricity bill and withdrawal.</span>
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
                    ['in', 'In'],
                    ['out', 'Out'],
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
                    Withdrawal in progress · <strong>{formatBtc(a.btc ?? 0)}</strong> from {a.vault}
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
                empty={
                  kind === 'out'
                    ? { title: 'Nothing has left your reserve', detail: 'Your rewards stay in your reserve until you withdraw them. Withdrawals will appear here.' }
                    : kind === 'in'
                      ? { title: 'Nothing added yet', detail: 'Your deposit and each monthly reward will appear here once recorded.' }
                      : undefined
                }
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
