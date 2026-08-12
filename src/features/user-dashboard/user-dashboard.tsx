'use client'

import { useState, type ReactNode } from 'react'
import './user-dashboard.css'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import {
  BanknotesIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CircleStackIcon,
  CurrencyDollarIcon,
  LockClosedIcon,
  PresentationChartLineIcon,
  ScaleIcon,
  SignalIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import {
  AllocationDualLineChart,
  HearstActivityChart,
  HearstExposureRadial,
  HearstLineChart,
  SignedBarChart,
} from '@/components/charts'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { AdminHeroTitle } from '@/components/admin/typography'
import { logout } from '@/lib/actions'
import { CONSOLE_GLOW_SRC, HEARST_H_SRC, consoleGlowLayer } from '@/lib/brand'
import { formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { readableSourceStateCap } from '@/lib/movements'
import { userInitials } from '@/components/layout/user-avatar-trigger'
import type { SessionUser } from '@/lib/session'
import { isAvailable, signalOf, valueOf, type Availability, type Signal } from '@/lib/vaults/model'
import { StatTile, deltaOf } from './stat-tile'
import { BreakdownFlank } from './breakdown-flank'
import { BtcContextFlank } from './btc-context-flank'
import { MovementTimeline } from './movement-timeline'
import { CapacityMeter } from './capacity-meter'
import type { UserDashboard } from './load'

/**
 * Account command center — session-scoped premium composition.
 * Widgets: animated stat-tile strip, a central chart switched by an iconified
 * segmented control with a sliding pill + crossfade, side donuts, a strategy
 * exposure (target vs actual) + capacity meter section, and a movement timeline
 * with a subscription-terms rail. All motion honors prefers-reduced-motion via
 * MotionConfig + the shared motion-ready guard. Backend-first: every absence is
 * a named state, never a fabricated zero. Charts only via the charts boundary.
 *
 * Reachable only with a valid console session (login remains admin-gated today).
 */

type CentralView = 'value' | 'allocation' | 'btc' | 'activity' | 'backtest'
type Route = 'dashboard' | 'trade'

const CENTRAL_VIEWS: readonly {
  readonly key: CentralView
  readonly label: string
  readonly icon: typeof PresentationChartLineIcon
}[] = [
  { key: 'value', label: 'Vault AUM', icon: PresentationChartLineIcon },
  { key: 'allocation', label: 'Fund allocation', icon: ChartPieIcon },
  { key: 'btc', label: 'BTC price', icon: CurrencyDollarIcon },
  { key: 'activity', label: 'Activity', icon: Squares2X2Icon },
  { key: 'backtest', label: 'Backtest', icon: BeakerIcon },
]

function seriesState(
  availability: { kind: 'available' | 'unavailable' },
  hasPoints: boolean,
  emptyMsg: string,
  unavailableMsg: string,
): SeriesState {
  if (availability.kind === 'unavailable') return { type: 'unavailable', explanation: unavailableMsg }
  if (!hasPoints) return { type: 'empty', explanation: emptyMsg }
  return { type: 'plotted' }
}

function investorPositionAbsent(data: UserDashboard): boolean {
  if (isAvailable(data.positionValue)) return false
  const reasons = new Set(['no_investor_position', 'no_investor_record'])
  if (data.positionValue.kind === 'unavailable' && data.positionValue.reason !== null && reasons.has(data.positionValue.reason)) {
    return true
  }
  if (data.position.kind === 'unavailable' && data.position.reason !== null && reasons.has(data.position.reason)) {
    return true
  }
  return data.positionValue.kind === 'unavailable'
}

function formatUsdc(amount: number | null): string {
  return amount !== null ? `${formatNumber(amount, { maximumFractionDigits: 0 })} USDC` : '—'
}

function freshnessLabel(signal: Signal): string | null {
  if (signal === 'live') return 'Live'
  if (signal === 'stale') return 'Stale'
  return null
}

function TermRow({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: typeof ScaleIcon; label: string; value: string }>) {
  return (
    <div className="term-row">
      <span className="term-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="term-label">{label}</span>
      <span className="term-value mono">{value}</span>
    </div>
  )
}

export function UserDashboardView({
  data,
  user,
}: Readonly<{ data: UserDashboard; user: SessionUser }>) {
  const [route, setRoute] = useState<Route>('dashboard')
  const [central, setCentral] = useState<CentralView>('value')
  const initials = userInitials(user.name)

  const isDashboard = route === 'dashboard'

  const valuePoints = valueOf(data.valueSeries)
  const valueState = seriesState(
    data.valueSeries,
    valuePoints !== null && valuePoints.length > 1,
    'Not enough history to trace a value curve yet.',
    'Awaiting a verified value source.',
  )
  const allocationTime = valueOf(data.allocationSeries)
  const allocationState = seriesState(
    data.allocationSeries,
    allocationTime !== null && allocationTime.length > 1,
    'Allocation history is not deep enough to plot yet.',
    'Awaiting a verified allocation source.',
  )
  const btcPoints = valueOf(data.btcSeries)
  const btcState = seriesState(
    data.btcSeries,
    btcPoints !== null && btcPoints.length > 1,
    'Not enough BTC snapshots to plot yet.',
    'Awaiting a verified market source.',
  )
  const activityBars = valueOf(data.activityBars)
  const activityBarsState = seriesState(
    data.activityBars,
    activityBars !== null && activityBars.length > 0,
    'No indexed activity for this period.',
    'Awaiting a verified activity source.',
  )
  const backtestRuns = valueOf(data.backtestRuns)
  const backtestState = seriesState(
    data.backtestRuns,
    backtestRuns !== null && backtestRuns.length > 0,
    'No backtest run to display yet.',
    'Awaiting a verified backtest source.',
  )

  const exposurePockets = valueOf(data.exposure)
  const exposureState = seriesState(
    data.exposure,
    exposurePockets !== null && exposurePockets.length > 0,
    'No pockets defined for this vault.',
    'Allocation terms did not resolve.',
  )

  const latestBtc = btcPoints !== null && btcPoints.length > 0 ? btcPoints[btcPoints.length - 1].value : null
  const vaultAum = valuePoints !== null && valuePoints.length > 0 ? valuePoints[valuePoints.length - 1].value : null
  const positionAbsent = investorPositionAbsent(data)
  const positionValue = valueOf(data.positionValue)
  const positionPrincipal = valueOf(data.positionPrincipal)
  const positionAccrued = valueOf(data.positionAccrued)
  const positionStatus = valueOf(data.positionStatus)
  const positionSubscribedAt = valueOf(data.positionSubscribedAt)
  const navPerShare = valueOf(data.navPerShare)
  const utilization = valueOf(data.utilizationPct)
  const availableCapacity = valueOf(data.availableCapacity)
  const minimumDeposit = valueOf(data.minimumDeposit)

  const btcTrend = btcPoints !== null ? btcPoints.map((p) => p.value) : undefined

  const centralChart: Record<
    CentralView,
    { question: string; unit: string; state: SeriesState; node: ReactNode; source: Availability<unknown> }
  > = {
    value: {
      question: 'Vault AUM',
      unit: 'fund total assets · USDC',
      state: valueState,
      node: valuePoints !== null ? <HearstLineChart points={[...valuePoints]} unit="USDC" viewport="hero" /> : null,
      source: data.valueSeries,
    },
    allocation: {
      question: 'Fund allocation over time',
      unit: 'cbBTC vs USDC · % of vault',
      state: allocationState,
      node: allocationTime !== null ? <AllocationDualLineChart points={[...allocationTime]} viewport="hero" /> : null,
      source: data.allocationSeries,
    },
    btc: {
      question: 'BTC price',
      unit: 'USDC · at vault snapshots',
      state: btcState,
      node: btcPoints !== null ? <HearstLineChart points={[...btcPoints]} unit="USDC" viewport="hero" /> : null,
      source: data.btcSeries,
    },
    activity: {
      // Vault-GLOBAL indexed on-chain events (series1), not this client's — kept
      // as explicit fund context, never presented as personal account activity.
      question: 'Vault activity',
      unit: 'indexed vault events · per day',
      state: activityBarsState,
      node: activityBars !== null ? <HearstActivityChart points={[...activityBars]} unit="events" viewport="hero" /> : null,
      source: data.activityBars,
    },
    backtest: {
      question: 'Backtest performance',
      unit: 'total return · % per scenario',
      state: backtestState,
      node: backtestRuns !== null ? <SignedBarChart items={[...backtestRuns]} viewport="hero" /> : null,
      source: data.backtestRuns,
    },
  }
  const active = centralChart[central]
  const fresh = freshnessLabel(signalOf(active.source))

  const centralBody =
    active.state.type === 'plotted' ? (
      active.node
    ) : (
      <div className={`center-state${active.state.type === 'unavailable' ? ' is-bad' : ''}`}>
        <span className="empty-mark" />
        <p>{active.state.explanation}</p>
      </div>
    )

  return (
    <MotionConfig reducedMotion="user">
      <div className="ud-root">
        {/* Shared Hearst glow behind the glass — same material as /admin. z-0,
            never above the shell. The shell's translucent glass lets it show. */}
        <div
          aria-hidden="true"
          className={consoleGlowLayer}
          style={{ backgroundImage: `url('${CONSOLE_GLOW_SRC}')` }}
        />
        <main className="page">
          <div className="shell backdrop-blur-xl backdrop-saturate-150">
            <header className="nav">
              <div className="brand">
                <img className="brand-mark" src={HEARST_H_SRC} alt="" width={28} height={28} />
                <span className="brand-name">Hearst</span>
              </div>
              <nav className="nav-links" aria-label="Main navigation">
                {(['dashboard', 'trade'] as Route[]).map((r) => (
                  <button
                    key={r}
                    className={route === r ? 'active' : undefined}
                    onClick={() => setRoute(r)}
                    type="button"
                  >
                    {route === r ? <motion.span layoutId="ud-nav-pill" className="nav-pill" aria-hidden="true" /> : null}
                    <span className="nav-inner">{r === 'dashboard' ? 'Dashboard' : 'Trade'}</span>
                  </button>
                ))}
              </nav>
              <div className="account-state">
                <i data-signal={signalOf(data.positionValue)} />
                <span className="sync-label">
                  {isAvailable(data.positionValue) ? 'Position live' : positionAbsent ? 'No investor position' : 'Position offline'}
                </span>
                <span className="avatar" title={user.email} aria-label={user.name}>
                  {initials || 'HC'}
                </span>
                <button
                  type="button"
                  className="sign-out"
                  onClick={() => {
                    void logout()
                  }}
                >
                  <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            </header>

            <div className={`dashboard-view${isDashboard ? '' : ' hidden'}`}>
              <header className="page-intro">
                <p className="eyebrow">Account</p>
                <AdminHeroTitle>Command center</AdminHeroTitle>
              </header>

              <section className="your-position" aria-label="Your position">
                <div className="section-heading">
                  <p className="eyebrow">Your position</p>
                  <h2>Book position</h2>
                  <span>Your on-book principal, accrued yield and subscription record — not vault AUM</span>
                </div>
                {positionAbsent ? (
                  <div className="position-absent">
                    <span className="empty-mark" />
                    <div>
                      <h3>No investor position</h3>
                      <span>
                        No book position is linked to this account — figures stay absent rather than zero.
                      </span>
                    </div>
                  </div>
                ) : null}
                <div className="position-grid">
                  <StatTile
                    icon={ScaleIcon}
                    label="Principal"
                    value={formatUsdc(positionPrincipal)}
                    signal={signalOf(data.positionPrincipal)}
                  />
                  <StatTile
                    icon={ChartPieIcon}
                    label="Accrued"
                    value={formatUsdc(positionAccrued)}
                    signal={signalOf(data.positionAccrued)}
                  />
                  <StatTile
                    icon={BanknotesIcon}
                    label="Position value"
                    value={formatUsdc(positionValue)}
                    signal={signalOf(data.positionValue)}
                  />
                  <StatTile
                    icon={SignalIcon}
                    label="Status"
                    value={positionStatus !== null ? readableSourceStateCap(positionStatus) : '—'}
                    signal={signalOf(data.positionStatus)}
                  />
                  <StatTile
                    icon={CalendarDaysIcon}
                    label="Subscribed at"
                    value={positionSubscribedAt !== null ? formatDateTime(positionSubscribedAt) : '—'}
                    signal={signalOf(data.positionSubscribedAt)}
                  />
                </div>
              </section>

              <section className="your-account" aria-label="Your account">
                <div className="section-heading">
                  <p className="eyebrow">Your account</p>
                  <h2>Capital activity</h2>
                  <span>Your verified deposits, distributions and movements only</span>
                </div>
                <div className="your-account-body">
                  <section className="movements" aria-label="Your movements">
                    <div className="movements-heading">
                      <div>
                        <h3>Your movements</h3>
                      </div>
                      <span>
                        Verified data only · {isAvailable(data.activityCount) ? data.activityCount.value : '—'} total
                      </span>
                    </div>
                    <MovementTimeline availability={data.activity} />
                  </section>
                  <BreakdownFlank
                    title="Your activity mix"
                    hint="Your movements by type"
                    icon={Squares2X2Icon}
                    availability={data.activityByType}
                    kind="count"
                    unit="events"
                  />
                </div>
              </section>

              <section className="fund-vault" aria-label="Fund and vault">
                <div className="section-heading">
                  <p className="eyebrow">Fund / Vault</p>
                  <h2>Vault context</h2>
                  <span>Fund-wide metrics and vault history — not your personal book position</span>
                </div>

                <section className="fund-kpis" aria-label="Fund indicators">
                  <StatTile
                    icon={PresentationChartLineIcon}
                    label="Vault AUM"
                    value={formatUsdc(vaultAum)}
                    signal={signalOf(data.valueSeries)}
                    trend={valuePoints !== null ? valuePoints.map((p) => p.value) : undefined}
                    delta={deltaOf(valuePoints)}
                  />
                  <StatTile
                    icon={SignalIcon}
                    label="Fund utilization"
                    value={utilization !== null ? formatPercent(utilization, { maximumFractionDigits: 1 }) : '—'}
                    signal={signalOf(data.utilizationPct)}
                  />
                  <StatTile
                    icon={CircleStackIcon}
                    label="Fund capacity left"
                    value={formatUsdc(availableCapacity)}
                    signal={signalOf(data.availableCapacity)}
                  />
                  <StatTile
                    icon={ScaleIcon}
                    label="NAV / share"
                    value={navPerShare !== null ? formatNumber(navPerShare, { maximumFractionDigits: 4 }) : '—'}
                    signal={signalOf(data.navPerShare)}
                  />
                  <StatTile
                    icon={CurrencyDollarIcon}
                    label="BTC price"
                    value={latestBtc !== null ? formatNumber(latestBtc, { maximumFractionDigits: 0 }) : '—'}
                    signal={signalOf(data.btcSeries)}
                    trend={btcTrend}
                    delta={deltaOf(btcPoints)}
                  />
                </section>

                <section className="analysis analysis--fund" aria-label="Fund analysis">
                  <BreakdownFlank
                    title="Vault allocation"
                    hint="Vault capital by bucket"
                    icon={ChartPieIcon}
                    availability={data.allocationBars}
                    kind="percent"
                    unit="%"
                    centerCaption="allocated"
                  />

                  <div className="center">
                    <div className="center-panel backdrop-blur-xl backdrop-saturate-150">
                      <div className="chart-switch" role="group" aria-label="Fund chart">
                        {CENTRAL_VIEWS.map((view) => {
                          const Icon = view.icon
                          const selected = central === view.key
                          return (
                            <button
                              key={view.key}
                              type="button"
                              aria-pressed={selected}
                              className={selected ? 'active' : undefined}
                              onClick={() => setCentral(view.key)}
                            >
                              {selected ? (
                                <motion.span layoutId="ud-central-pill" className="switch-pill" aria-hidden="true" />
                              ) : null}
                              <span className="switch-inner">
                                <Icon className="size-4" aria-hidden="true" />
                                {view.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="center-head">
                        <h2>{active.question}</h2>
                        <span>{active.unit}</span>
                        {fresh !== null ? (
                          <span className="fresh-badge" data-signal={signalOf(active.source)}>
                            {fresh}
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
                            {centralBody}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <BtcContextFlank
                    marketSnapshot={data.marketSnapshot}
                    btcPoints={btcPoints}
                    btcProducedTotal={data.btcProducedTotal}
                    onViewBtc={() => setCentral('btc')}
                  />
                </section>

                <section className="exposure-cap" aria-label="Strategy exposure and capacity">
                  <div className="ec-panel">
                    <div className="ec-heading">
                      <h2>
                        <PresentationChartLineIcon className="size-4" aria-hidden="true" />
                        Strategy exposure
                      </h2>
                      <span>Target vs actual · % of vault</span>
                    </div>
                    <div className="ec-body">
                      {exposureState.type === 'plotted' && exposurePockets !== null ? (
                        <HearstExposureRadial items={[...exposurePockets]} />
                      ) : (
                        <div className={`center-state${exposureState.type === 'unavailable' ? ' is-bad' : ''}`}>
                          <span className="empty-mark" />
                          <p>{exposureState.type !== 'plotted' ? exposureState.explanation : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ec-panel">
                    <div className="ec-heading">
                      <h2>
                        <SignalIcon className="size-4" aria-hidden="true" />
                        Fund capacity
                      </h2>
                      <span>Utilization toward the vault cap</span>
                    </div>
                    <div className="ec-body ec-body--meter">
                      <CapacityMeter utilization={data.utilizationPct} capacity={data.availableCapacity} />
                    </div>
                    <div className="ec-terms">
                      <TermRow
                        icon={LockClosedIcon}
                        label="Minimum deposit"
                        value={minimumDeposit !== null ? `${formatNumber(minimumDeposit, { maximumFractionDigits: 0 })} USDC` : '—'}
                      />
                    </div>
                  </div>
                </section>
              </section>
            </div>

            <section className={`trade-view${isDashboard ? '' : ' active'}`}>
              <div>
                <p className="eyebrow">Execution only</p>
                <AdminHeroTitle>Trade terminal</AdminHeroTitle>
                <p>
                  This space is strictly reserved for execution. No catalog, quote or account
                  management element is presented here.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
