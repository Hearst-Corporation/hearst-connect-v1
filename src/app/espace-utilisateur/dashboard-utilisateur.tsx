'use client'

import { useState, type ReactNode } from 'react'
import './dashboard-utilisateur.css'
import {
  AllocationDualLineChart,
  HearstActivityChart,
  HearstDonutChart,
  HearstLineChart,
  SignedBarChart,
} from '@/components/charts'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { formatNumber, formatRelativeTime } from '@/lib/format'
import { isAvailable, signalOf, valueOf } from '@/lib/vaults/model'
import type { UserDashboard, UserMovement } from './load'

/**
 * Investor dashboard — one central chart switched by a button row, flanked by a
 * donut on each side, over the investor's own data. Shape ported from the
 * prototype (nav, gutters, KPI hero), colors/surfaces on DS tokens.
 *
 * Every series is backend-first (`loadUserDashboard`) and rendered through the
 * charts boundary (Recharts). Absence is a named `SeriesState` — never a zero.
 * The page scrolls as one document; no nested scroll trap.
 */

type CentralView = 'value' | 'allocation' | 'btc' | 'activity' | 'backtest'
type Route = 'dashboard' | 'trade'

const CENTRAL_VIEWS: readonly { readonly key: CentralView; readonly label: string }[] = [
  { key: 'value', label: 'Value' },
  { key: 'allocation', label: 'Allocation' },
  { key: 'btc', label: 'BTC price' },
  { key: 'activity', label: 'Activity' },
  { key: 'backtest', label: 'Backtest' },
]

/** Availability → chart SeriesState with a named explanation. */
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

function DonutPanel({
  title,
  hint,
  availability,
  unit,
}: Readonly<{
  title: string
  hint: string
  availability: UserDashboard['allocationBars']
  unit: string
}>) {
  const slices = valueOf(availability)
  return (
    <section className="flank-panel">
      <div className="flank-heading">
        <h2>{title}</h2>
        <span>{hint}</span>
      </div>
      {slices !== null && slices.length > 0 ? (
        <HearstDonutChart slices={slices.map((s) => ({ label: s.label, value: s.value }))} unit={unit} />
      ) : (
        <div className="flank-empty">
          <span className="empty-mark" />
          <p>{isAvailable(availability) ? 'Nothing to break down yet.' : 'Awaiting a verified source.'}</p>
        </div>
      )}
    </section>
  )
}

function ActivityList({ availability }: Readonly<{ availability: UserDashboard['activity'] }>) {
  const rows = valueOf(availability)
  if (rows === null || rows.length === 0) {
    return (
      <div className="empty">
        <span className="empty-mark" />
        <div>
          <p className="eyebrow">Account history</p>
          <h3>No verified activity yet</h3>
          <span>
            Your deposits, distributions and account events will appear here from the verified
            source, most recent first.
          </span>
        </div>
      </div>
    )
  }
  return (
    <div className="movements-list" aria-label="Account movements">
      {rows.map((movement: UserMovement) => (
        <div className="movement-row" key={movement.id}>
          <span className="movement-title">{movement.title}</span>
          <small>
            {[movement.detail, movement.occurredAt !== null ? formatRelativeTime(movement.occurredAt) : null]
              .filter((part): part is string => part !== null && part !== '')
              .join(' · ') || '—'}
          </small>
        </div>
      ))}
    </div>
  )
}

export function DashboardUtilisateur({ data }: Readonly<{ data: UserDashboard }>) {
  const [route, setRoute] = useState<Route>('dashboard')
  const [central, setCentral] = useState<CentralView>('value')

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

  const latestValue = valuePoints !== null && valuePoints.length > 0 ? valuePoints[valuePoints.length - 1].value : null
  const latestBtc = btcPoints !== null && btcPoints.length > 0 ? btcPoints[btcPoints.length - 1].value : null
  const activityLabel = isAvailable(data.activityCount) ? data.activityCount.value : '—'

  const centralChart: Record<CentralView, { question: string; unit: string; state: SeriesState; node: ReactNode }> = {
    value: {
      question: 'Vault value',
      unit: 'total assets · USDC',
      state: valueState,
      node: valuePoints !== null ? <HearstLineChart points={[...valuePoints]} unit="USDC" height={340} /> : null,
    },
    allocation: {
      question: 'Allocation over time',
      unit: 'cbBTC vs USDC · %',
      state: allocationState,
      node: allocationTime !== null ? <AllocationDualLineChart points={[...allocationTime]} height={320} /> : null,
    },
    btc: {
      question: 'BTC price',
      unit: 'USDC · at vault snapshots',
      state: btcState,
      node: btcPoints !== null ? <HearstLineChart points={[...btcPoints]} unit="USDC" height={340} /> : null,
    },
    activity: {
      question: 'Account activity',
      unit: 'indexed events · per day',
      state: activityBarsState,
      node: activityBars !== null ? <HearstActivityChart points={[...activityBars]} unit="events" height={340} /> : null,
    },
    backtest: {
      question: 'Backtest performance',
      unit: 'total return · % per scenario',
      state: backtestState,
      node: backtestRuns !== null ? <SignedBarChart items={[...backtestRuns]} height={340} /> : null,
    },
  }
  const active = centralChart[central]

  return (
    <div className="eu-root">
      <main className="page">
        <div className="shell">
          <header className="nav">
            <div className="brand">
              <span className="brand-mark">H</span>
              <span className="brand-name">Hearst</span>
            </div>
            <nav className="nav-links" aria-label="Main navigation">
              <button className={isDashboard ? 'active' : undefined} onClick={() => setRoute('dashboard')} type="button">
                Dashboard
              </button>
              <button className={!isDashboard ? 'active' : undefined} onClick={() => setRoute('trade')} type="button">
                Trade
              </button>
            </nav>
            <div className="account-state">
              <i data-signal={signalOf(data.valueSeries)} />
              <span>{isAvailable(data.valueSeries) ? 'Account synced' : 'Account offline'}</span>
              <span className="avatar">A</span>
            </div>
          </header>

          <div className={`dashboard-view${isDashboard ? '' : ' hidden'}`}>
            <section className="kpis" aria-label="Account indicators">
              <div className="intro">
                <p className="eyebrow">Account</p>
                <h1>Command center</h1>
              </div>
              <div className="kpi">
                <span>Vault value</span>
                <strong>{latestValue !== null ? formatNumber(latestValue, { maximumFractionDigits: 0 }) : '—'}</strong>
                <small>{latestValue !== null ? 'USDC · latest snapshot' : 'Awaiting verified source'}</small>
              </div>
              <div className="kpi">
                <span>BTC price</span>
                <strong>{latestBtc !== null ? formatNumber(latestBtc, { maximumFractionDigits: 0 }) : '—'}</strong>
                <small>{latestBtc !== null ? 'USDC · at snapshot' : 'No market snapshot'}</small>
              </div>
              <div className="kpi">
                <span>Movements</span>
                <strong>{activityLabel}</strong>
                <small>{isAvailable(data.activity) ? 'On your account' : 'Account offline'}</small>
              </div>
            </section>

            <section className="analysis" aria-label="Analysis">
              <DonutPanel
                title="Allocation"
                hint="Capital by bucket"
                availability={data.allocationBars}
                unit="% of vault"
              />

              <div className="center">
                <div className="center-panel">
                  <div className="chart-switch" role="group" aria-label="Central chart">
                    {CENTRAL_VIEWS.map((view) => (
                      <button
                        key={view.key}
                        type="button"
                        aria-pressed={central === view.key}
                        className={central === view.key ? 'active' : undefined}
                        onClick={() => setCentral(view.key)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </div>
                  <div className="center-head">
                    <h2>{active.question}</h2>
                    <span>{active.unit}</span>
                  </div>
                  <div className="center-plot">
                    {active.state.type === 'plotted' ? (
                      active.node
                    ) : (
                      <div className={`center-state${active.state.type === 'unavailable' ? ' is-bad' : ''}`}>
                        <span className="empty-mark" />
                        <p>{active.state.explanation}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DonutPanel
                title="Activity mix"
                hint="Events by type"
                availability={data.activityByType}
                unit="events"
              />
            </section>

            <section className="movements" aria-label="Account movements">
              <div className="movements-heading">
                <div>
                  <p className="eyebrow">Capital</p>
                  <h2>Account movements</h2>
                </div>
                <span>Verified data only · {activityLabel} total</span>
              </div>
              <ActivityList availability={data.activity} />
            </section>
          </div>

          <section className={`trade-view${isDashboard ? '' : ' active'}`}>
            <div>
              <p className="eyebrow">Execution only</p>
              <h1>Trade terminal</h1>
              <p>
                This space is strictly reserved for execution. No catalog, quote or account
                management element is presented here.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
