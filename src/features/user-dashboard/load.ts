import 'server-only'

import { callBackend, statusFromMeta } from '@/lib/backend/client'
import { availabilityFromResolved, type ResolvedBlock } from '@/lib/backend/availability'
import { measuredCount, type Availability } from '@/lib/vaults/model'

/**
 * Account dashboard loader — session-scoped, backend-first.
 *
 * Reads session read-models (auth: 'session', scoped to the connected account):
 * the `/api/v1/dashboard` aggregate, `vault/history` (value + allocation + BTC
 * price series), `series1/events` (activity), and `backtest/historical`
 * (product performance). NOTHING is admin-wide.
 *
 * Login remains admin-gated today; this loader never invents an investor role.
 *
 * Every field is an `Availability<T>` produced by the canonical adapter — an
 * absent surface is a NAMED absence, never a zero, never a fabricated value
 * (doctrine `check:mocks` / `check:truthful-data`). Numeric strings from the
 * backend are parsed defensively; a non-finite parse drops the point.
 */

const DASHBOARD_ENDPOINT = '/api/v1/dashboard'
const HISTORY_ENDPOINT = '/api/v1/vault/history'
const SERIES1_ENDPOINT = '/api/v1/series1/events'
const BACKTEST_ENDPOINT = '/api/v1/backtest/historical'
const VAULT_ENDPOINT = '/api/v1/vault'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

/** Reads `{ status, value }` out of an enveloped `{ key: { status, value } }` shape. */
function envelopeField(raw: unknown, key: string): ResolvedBlock<unknown> {
  if (typeof raw === 'object' && raw !== null) {
    const field = (raw as Record<string, unknown>)[key]
    if (isResolvedField(field)) {
      return { status: field.status, value: field.value, reason: field.reason ?? null }
    }
  }
  return { status: 'UNAVAILABLE', value: null, reason: `${key}_absent` }
}

/** Parses a backend numeric (number or numeric string); null when not finite. */
function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** Short day label `MM-DD` from an ISO timestamp, for chart axes. */
function dayLabel(iso: unknown): string {
  if (typeof iso !== 'string' || iso.length < 10) return '—'
  return iso.slice(5, 10)
}

// ── Public point/row shapes consumed by the client charts ────────────────────

type ValuePoint = { readonly label: string; readonly value: number; readonly detail: string }
export type AllocationBar = { readonly label: string; readonly value: number }
type AllocationTimePoint = {
  readonly label: string
  readonly cbbtcPct: number
  readonly usdcPct: number
  readonly detail: string
}
type BtcPoint = { readonly label: string; readonly value: number; readonly detail: string }
type ActivityBar = { readonly label: string; readonly value: number; readonly detail: string }
type BacktestRun = { readonly label: string; readonly value: number; readonly detail: string }
export type ExposurePocket = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}
export type UserMovement = {
  readonly id: string
  readonly title: string
  readonly detail: string | null
  /** Whole-USDC amount of this ledger movement. Null when the source carries no
   *  amount — an absent amount is never rendered as 0. */
  readonly amountUsdc: number | null
  readonly occurredAt: string | null
}

export type UserDashboard = {
  readonly sourceStatus: string
  readonly position: Availability<ResolvedField>
  /** The CLIENT's own book position value (principal + accrued), whole USDC. */
  readonly positionValue: Availability<number>
  /** The CLIENT's on-book principal (deposits), whole USDC. */
  readonly positionPrincipal: Availability<number>
  /** The CLIENT's accrued yield (book), whole USDC. */
  readonly positionAccrued: Availability<number>
  readonly performance: Availability<ResolvedField>
  readonly subscription: Availability<ResolvedField>
  /** Latest-snapshot allocation buckets (donut). */
  readonly allocationBars: Availability<readonly AllocationBar[]>
  /** Allocation over time — cbBTC vs USDC percentages (dual line). */
  readonly allocationSeries: Availability<readonly AllocationTimePoint[]>
  /** Vault total value over time (line). */
  readonly valueSeries: Availability<readonly ValuePoint[]>
  /** BTC price at each vault snapshot (line). */
  readonly btcSeries: Availability<readonly BtcPoint[]>
  /** Indexed activity aggregated per day (bars). */
  readonly activityBars: Availability<readonly ActivityBar[]>
  /** Product backtest runs — total return per scenario (bars). */
  readonly backtestRuns: Availability<readonly BacktestRun[]>
  /** Target vs actual allocation per pocket (paired bars). */
  readonly exposure: Availability<readonly ExposurePocket[]>
  /** NAV per share (whole USDC). */
  readonly navPerShare: Availability<number>
  /** Vault utilization toward the TVL cap (%). */
  readonly utilizationPct: Availability<number>
  /** Room remaining until the TVL cap (USDC). */
  readonly availableCapacity: Availability<number>
  /** Minimum subscription deposit (USDC). */
  readonly minimumDeposit: Availability<number>
  /** Investor movements grouped by category (donut). */
  readonly activityByType: Availability<readonly AllocationBar[]>
  /** The investor's own movements (list). */
  readonly activity: Availability<readonly UserMovement[]>
  readonly activityCount: Availability<string>
}

// ── History snapshot parsing ─────────────────────────────────────────────────

type Allocation = { readonly bucket?: string; readonly pct?: unknown; readonly valueUsdc?: unknown }
type Snapshot = {
  readonly takenAt?: string
  readonly aumUsdc?: unknown
  readonly btcPriceUsdc?: unknown
  readonly allocations?: readonly Allocation[]
}

/** Normalizes the history response `{ snapshots: { value: [...] } }` to snapshots. */
function historySnapshots(raw: unknown): readonly Snapshot[] {
  const field = envelopeField(raw, 'snapshots')
  return Array.isArray(field.value) ? (field.value as readonly Snapshot[]) : []
}

const bucketPct = (snap: Snapshot, matcher: (bucket: string) => boolean): number | null => {
  const found = (snap.allocations ?? []).find((a) => typeof a.bucket === 'string' && matcher(a.bucket))
  return found ? num(found.pct) : null
}

function valueSeriesFrom(snaps: readonly Snapshot[]): readonly ValuePoint[] | null {
  const points = snaps
    .map((s) => ({ v: num(s.aumUsdc), at: s.takenAt }))
    .filter((p): p is { v: number; at: string | undefined } => p.v !== null)
    .map((p) => ({ label: dayLabel(p.at), value: p.v, detail: dayLabel(p.at) }))
  return points.length > 0 ? points : null
}

function btcSeriesFrom(snaps: readonly Snapshot[]): readonly BtcPoint[] | null {
  const points = snaps
    .map((s) => ({ v: num(s.btcPriceUsdc), at: s.takenAt }))
    .filter((p): p is { v: number; at: string | undefined } => p.v !== null)
    .map((p) => ({ label: dayLabel(p.at), value: p.v, detail: dayLabel(p.at) }))
  return points.length > 0 ? points : null
}

function allocationSeriesFrom(snaps: readonly Snapshot[]): readonly AllocationTimePoint[] | null {
  const points = snaps
    .map((s) => {
      const cbbtc = bucketPct(s, (b) => b.includes('cbbtc') || b.includes('btc'))
      const usdc = bucketPct(s, (b) => b.includes('usdc'))
      return cbbtc !== null && usdc !== null
        ? { label: dayLabel(s.takenAt), cbbtcPct: cbbtc, usdcPct: usdc, detail: dayLabel(s.takenAt) }
        : null
    })
    .filter((p): p is AllocationTimePoint => p !== null)
  return points.length > 0 ? points : null
}

function allocationBarsFrom(snaps: readonly Snapshot[]): readonly AllocationBar[] | null {
  const last = snaps.length > 0 ? snaps[snaps.length - 1] : undefined
  if (last?.allocations === undefined) return null
  const bars = last.allocations
    .map((a) => {
      const value = num(a.pct)
      return typeof a.bucket === 'string' && value !== null
        ? { label: a.bucket.replace(/_/g, ' '), value }
        : null
    })
    .filter((b): b is AllocationBar => b !== null)
  return bars.length > 0 ? bars : null
}

/** Aggregates indexed events per day into ascending bars. */
function activityBarsFrom(raw: unknown): readonly ActivityBar[] | null {
  const field = envelopeField(raw, 'events')
  if (!Array.isArray(field.value)) return null
  const perDay = new Map<string, number>()
  for (const event of field.value) {
    if (typeof event === 'object' && event !== null) {
      const at = (event as Record<string, unknown>).occurredAt
      if (typeof at === 'string' && at.length >= 10) {
        const key = at.slice(0, 10)
        const previous = perDay.get(key)
        perDay.set(key, (previous === undefined ? 0 : previous) + 1)
      }
    }
  }
  if (perDay.size === 0) return null
  return [...perDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ label: day.slice(5), value: count, detail: day }))
}

function backtestRunsFrom(raw: unknown): readonly BacktestRun[] | null {
  const field = envelopeField(raw, 'runs')
  if (!Array.isArray(field.value)) return null
  const runs = field.value
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => {
      const value = num(r.totalReturnPct)
      const key = typeof r.backtestKey === 'string' ? r.backtestKey.replace(/_/g, ' ') : 'run'
      return value !== null ? { label: key, value, detail: `${key} · total return` } : null
    })
    .filter((r): r is BacktestRun => r !== null)
  return runs.length > 0 ? runs : null
}

const USDC_ATOMIC = 1_000_000

/** Target vs actual allocation pockets from product-factsheet terms. */
function exposureFrom(factsheetData: unknown): readonly ExposurePocket[] | null {
  const terms = envelopeField(factsheetData, 'terms').value as Record<string, unknown> | null
  const allocation = terms?.allocation as Record<string, unknown> | null
  const list = allocation?.pockets
  if (!Array.isArray(list)) return null
  const rows = list
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => {
      const target = num(p.targetBps)
      const actual = num(p.actualBps)
      const label =
        typeof p.label === 'string' ? p.label : typeof p.pocket === 'string' ? p.pocket : 'Pocket'
      return target === null
        ? null
        : { label, targetPct: target / 100, actualPct: actual === null ? null : actual / 100 }
    })
    .filter((r): r is ExposurePocket => r !== null)
  return rows.length > 0 ? rows : null
}

function navPerShareFrom(vaultData: unknown): number | null {
  const snap = envelopeField(vaultData, 'snapshot').value as Record<string, unknown> | null
  return num(snap?.navPerShare)
}

/** Utilization (%) and room-to-cap (USDC) from vault capacity. */
function capacityFrom(vaultData: unknown): {
  utilizationPct: number | null
  availableCapacity: number | null
} {
  const cap = envelopeField(vaultData, 'capacity').value as Record<string, unknown> | null
  const util = num(cap?.utilizationBps)
  const avail = num(cap?.availableCapacity)
  return {
    utilizationPct: util === null ? null : util / 100,
    availableCapacity: avail === null ? null : avail / USDC_ATOMIC,
  }
}

function minDepositFrom(factsheetData: unknown): number | null {
  const terms = envelopeField(factsheetData, 'terms').value as Record<string, unknown> | null
  const min = num(terms?.minimumDepositUsdc)
  return min === null ? null : min / USDC_ATOMIC
}

/** Friendly labels for the backend ledger kinds (InvestorTransaction.type). */
const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdrawal',
  claim: 'Claim',
  distribution: 'Distribution',
}

function movementsFrom(field: ResolvedField | null): readonly UserMovement[] | null {
  const value = field?.value
  if (!Array.isArray(value)) return null
  const rows = value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row, index) => {
      // The activity feed is the CLIENT's ledger — backend ActivityItem:
      // { type, amountUsdc, occurredAt, txHash }. `type` is the movement kind.
      // The legacy name/eventName/title/category fields are a defensive fallback
      // for any other array that might reach this parser.
      const kind =
        typeof row.type === 'string' && row.type !== ''
          ? row.type
          : typeof row.name === 'string'
            ? row.name
            : typeof row.eventName === 'string'
              ? row.eventName
              : typeof row.title === 'string'
                ? row.title
                : null
      const title =
        kind === null
          ? 'Movement'
          : (MOVEMENT_TYPE_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1))
      // detail carries the raw kind — it drives the category chip, the icon, and
      // the by-type breakdown. Falls back to an explicit `category` if present.
      const detail = kind ?? (typeof row.category === 'string' ? row.category : null)
      // amountUsdc is a whole-USDC decimal string on the wire. Absent or
      // unparseable → null (never 0: an absent amount is not a zero movement).
      const rawAmount = row.amountUsdc
      const parsedAmount =
        typeof rawAmount === 'string'
          ? Number(rawAmount)
          : typeof rawAmount === 'number'
            ? rawAmount
            : null
      const amountUsdc =
        parsedAmount !== null && Number.isFinite(parsedAmount) ? parsedAmount : null
      const id =
        typeof row.id === 'string'
          ? row.id
          : typeof row.txHash === 'string'
            ? row.txHash
            : String(index)
      const occurredAt =
        typeof row.occurredAt === 'string'
          ? row.occurredAt
          : typeof row.timestamp === 'string'
            ? row.timestamp
            : null
      return { id, title, detail, amountUsdc, occurredAt }
    })
  return rows.length > 0 ? rows : null
}

/** Groups movements by category into donut slices — a real breakdown, not invented. */
function activityByTypeFrom(movements: readonly UserMovement[] | null): readonly AllocationBar[] | null {
  if (movements === null || movements.length === 0) return null
  const perType = new Map<string, number>()
  for (const movement of movements) {
    const key = movement.detail ?? 'other'
    const previous = perType.get(key)
    perType.set(key, (previous === undefined ? 0 : previous) + 1)
  }
  return [...perType.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }))
}

/**
 * The CLIENT's own position book values from `dashboard.position` (InvestorPosition).
 * These are backend book figures in whole USDC — `value` = principal + accrued —
 * NOT a mark-to-market. `shares` is null (the DB holds no share balance), so a
 * client value is never computed as shares × NAV. Absent → null (never 0).
 */
function positionBookFrom(field: ResolvedField | null, key: 'value' | 'principal' | 'accrued'): number | null {
  const pos = field?.value
  if (typeof pos !== 'object' || pos === null) return null
  return num((pos as Record<string, unknown>)[key])
}

function surface(aggregate: Record<string, unknown> | null, key: string): ResolvedBlock<ResolvedField> {
  const field = aggregate?.[key]
  if (!isResolvedField(field)) {
    return { status: 'UNAVAILABLE', value: null, reason: `surface_${key}_absent` }
  }
  return { status: field.status, value: field, reason: field.reason ?? null }
}

export async function loadUserDashboard(): Promise<UserDashboard> {
  const [
    aggregateResponse,
    historyResponse,
    series1Response,
    backtestResponse,
    vaultResponse,
    factsheetResponse,
  ] = await Promise.all([
    callBackend<Record<string, unknown>>('dashboard'),
    callBackend<unknown>('vault-history'),
    callBackend<unknown>('series1-events'),
    callBackend<unknown>('backtest-historical'),
    callBackend<unknown>('vault'),
    callBackend<unknown>('product-factsheet'),
  ])

  const aggregate = aggregateResponse.ok ? aggregateResponse.data : null
  const sourceStatus = aggregateResponse.ok ? statusFromMeta(aggregateResponse.meta) : 'UNAVAILABLE'

  const positionRF = surface(aggregate, 'position')
  const position = availabilityFromResolved(positionRF, DASHBOARD_ENDPOINT)
  // Client book values — the account's OWN money, per-client at the query layer.
  // Loaded here so the view no longer drops them (P0: dashboard.position was
  // fetched then ignored). value = principal + accrued (book), shares stay null.
  const positionValue = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'value'), reason: 'no_investor_position' },
    DASHBOARD_ENDPOINT,
  )
  const positionPrincipal = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'principal'), reason: 'no_investor_position' },
    DASHBOARD_ENDPOINT,
  )
  const positionAccrued = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'accrued'), reason: 'no_investor_position' },
    DASHBOARD_ENDPOINT,
  )
  const performance = availabilityFromResolved(surface(aggregate, 'performance'), DASHBOARD_ENDPOINT)
  const subscription = availabilityFromResolved(surface(aggregate, 'subscription'), DASHBOARD_ENDPOINT)

  // Account movements are the CALLER's own investor activity, and only that.
  // The global `recentEvents` vault feed must NEVER stand in for it: a fallback
  // there would present fund-wide events under a personal label (the P0 tenant-
  // truth defect). Client activity absent → the section reports UNAVAILABLE;
  // present-but-empty → EMPTY. Global data never silently becomes client data.
  const activityField = surface(aggregate, 'activity')
  const activitySourceStatus = activityField.status
  const activityValue = movementsFrom(activityField.value)
  const activity = availabilityFromResolved<readonly UserMovement[]>(
    { status: activitySourceStatus, value: activityValue, reason: 'no_investor_movement' },
    DASHBOARD_ENDPOINT,
  )
  const activityCount = measuredCount(activity)
  const activityByType = availabilityFromResolved<readonly AllocationBar[]>(
    { status: activitySourceStatus, value: activityByTypeFrom(activityValue), reason: 'no_investor_movement' },
    DASHBOARD_ENDPOINT,
  )

  // Series from `vault/history` — freshness is the history envelope status.
  // Backend serves snapshots newest-first — sort ascending so derived series
  // (value/BTC/allocation), the "latest" figure and the trend deltas are all
  // chronological, not reversed.
  const snaps = (historyResponse.ok ? historySnapshots(historyResponse.data) : [])
    .slice()
    .sort((a, b) => String(a.takenAt ?? '').localeCompare(String(b.takenAt ?? '')))
  const historyStatus = historyResponse.ok ? statusFromMeta(historyResponse.meta) : 'UNAVAILABLE'
  const historyBlock = <T,>(value: T | null): ResolvedBlock<T> => ({
    status: historyStatus,
    value,
    reason: 'no_history_snapshot',
  })
  const valueSeries = availabilityFromResolved(historyBlock(valueSeriesFrom(snaps)), HISTORY_ENDPOINT)
  const btcSeries = availabilityFromResolved(historyBlock(btcSeriesFrom(snaps)), HISTORY_ENDPOINT)
  const allocationSeries = availabilityFromResolved(
    historyBlock(allocationSeriesFrom(snaps)),
    HISTORY_ENDPOINT,
  )
  const allocationBars = availabilityFromResolved(
    historyBlock(allocationBarsFrom(snaps)),
    HISTORY_ENDPOINT,
  )

  // Activity bars from `series1/events` — freshness is that envelope's status.
  const series1Status = series1Response.ok ? statusFromMeta(series1Response.meta) : 'UNAVAILABLE'
  const activityBars = availabilityFromResolved(
    { status: series1Status, value: series1Response.ok ? activityBarsFrom(series1Response.data) : null, reason: 'no_indexed_event' },
    SERIES1_ENDPOINT,
  )

  // Backtest runs from `backtest/historical`.
  const backtestStatus = backtestResponse.ok ? statusFromMeta(backtestResponse.meta) : 'UNAVAILABLE'
  const backtestRuns = availabilityFromResolved(
    { status: backtestStatus, value: backtestResponse.ok ? backtestRunsFrom(backtestResponse.data) : null, reason: 'no_backtest_run' },
    BACKTEST_ENDPOINT,
  )

  // Vault + factsheet stats — real target/actual, NAV, capacity, terms.
  const vaultStatus = vaultResponse.ok ? statusFromMeta(vaultResponse.meta) : 'UNAVAILABLE'
  const factsheetStatus = factsheetResponse.ok ? statusFromMeta(factsheetResponse.meta) : 'UNAVAILABLE'
  const capVals = vaultResponse.ok
    ? capacityFrom(vaultResponse.data)
    : { utilizationPct: null, availableCapacity: null }
  const navPerShare = availabilityFromResolved<number>(
    { status: vaultStatus, value: vaultResponse.ok ? navPerShareFrom(vaultResponse.data) : null, reason: 'no_nav' },
    VAULT_ENDPOINT,
  )
  const utilizationPct = availabilityFromResolved<number>(
    { status: vaultStatus, value: capVals.utilizationPct, reason: 'no_capacity' },
    VAULT_ENDPOINT,
  )
  const availableCapacity = availabilityFromResolved<number>(
    { status: vaultStatus, value: capVals.availableCapacity, reason: 'no_capacity' },
    VAULT_ENDPOINT,
  )
  const exposure = availabilityFromResolved<readonly ExposurePocket[]>(
    { status: factsheetStatus, value: factsheetResponse.ok ? exposureFrom(factsheetResponse.data) : null, reason: 'no_exposure' },
    FACTSHEET_ENDPOINT,
  )
  const minimumDeposit = availabilityFromResolved<number>(
    { status: factsheetStatus, value: factsheetResponse.ok ? minDepositFrom(factsheetResponse.data) : null, reason: 'no_min_deposit' },
    FACTSHEET_ENDPOINT,
  )

  return {
    sourceStatus,
    position,
    positionValue,
    positionPrincipal,
    positionAccrued,
    performance,
    subscription,
    allocationBars,
    allocationSeries,
    valueSeries,
    btcSeries,
    activityBars,
    backtestRuns,
    exposure,
    navPerShare,
    utilizationPct,
    availableCapacity,
    minimumDeposit,
    activityByType,
    activity,
    activityCount,
  }
}
