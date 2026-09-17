/**
 * Mining-note engine client — types and fetch helpers for the hearst-vault-v2
 * `nextjs-vault-server` API (`MINING_NOTE_FRONTEND.md`, 2026-09-16).
 *
 * Two access paths, one origin:
 *   - Server components call `miningNoteServerUrl()` and hit the origin
 *     directly (no self-proxy through the rewrite — rewrites exist for the
 *     browser only).
 *   - Client components fetch the same-origin paths (`/api/mining-note/…`,
 *     `/api/mining/…`) that `next.config.mjs` tunnels to the same origin.
 *
 * Contract gotchas the types/comment below encode (read before charting):
 *   - `roiPct` / `finalAlphaPct` / discount fields are FRACTIONS (×100 to
 *     display); `projections.returnPct` is ALREADY ×100. Legacy asymmetry.
 *   - Monte-Carlo `paths` / `percentiles` are BTC PRICE, not note value.
 *     Note-value stats are `medianExit`, `capitalBackProbability`, `cvar5`.
 *   - Months are 1-based; `months[]` carries no M0 row.
 *   - `/projections` and `/sensitivity` are NOT wrapped in `data` — read
 *     their top-level keys.
 */

const envBaseUrl = process.env.MINING_NOTE_API_URL ?? 'http://localhost:3105'

/** Absolute origin for server-side fetches (RSC / route handlers). */
export function miningNoteServerUrl(): string {
  return envBaseUrl
}

/* ── Types ───────────────────────────────────────────────────────────────── */

export type MonthlyEvent =
  | { type: 'PRODUCTION'; btcMined: number }
  | { type: 'PAY_ELECTRICITY'; amount: number }
  | { type: 'CURTAILMENT'; reason: 'pre_halving' | 'post_halving' }
  | { type: 'TAKE_PROFIT'; btcSold: number; usdcLocked: number; tier: number }
  | { type: 'SELL_BTC_FOR_ELEC'; btcSold: number; usdcReceived: number; reason: 'reserve_threshold' }
  | { type: 'DISTRIBUTE_SURPLUS'; coupon: number }
  | { type: 'BUYBACK_MACHINES'; amount: number }
  | { type: 'EXIT'; netReleasableUsd: number }

export type MonthlyState = {
  /** 1-based month index — no M0 row. */
  readonly month: number
  readonly btcPrice: number
  readonly fleetActive: boolean
  /** Post-curtailment: 0 when curtailed (see `CURTAILMENT` in `events`). */
  readonly btcMined: number
  readonly elecCost: number
  /** Infinity (→ serialized `null`) when curtailed — treat as "fleet off". */
  readonly miningCashCostPerBtc: number | null
  readonly btcPouchBtc: number
  readonly btcPouchValue: number
  readonly reserveUsdc: number
  readonly reserveAboveThreshold: boolean
  readonly stackBtc: number
  readonly stackValue: number
  readonly events: readonly MonthlyEvent[]
  readonly noteValue: number
  readonly liquidValue: number
  readonly machineValue: number
  readonly netReleasableUsd: number
}

export type MiningNoteSummary = {
  readonly totalBtcMined: number
  readonly totalElecPaid: number
  readonly monthsCurtailed: number
  readonly totalTakeProfitUsdc: number
  readonly finalNetReleasableUsd: number
  readonly finalNoteValue: number
  /** FRACTION — 1.90 = +190 %. ×100 for display. */
  readonly roiPct: number
}

export type MiningNoteResult = {
  readonly months: readonly MonthlyState[]
  readonly summary: MiningNoteSummary
}

/** `GET /projections` — NOT wrapped in `data`; `returnPct` already ×100. */
export type ProjectionRow = {
  readonly name: string
  readonly netReleasable: number
  /** ALREADY ×100 (88.5 = +88.5 %) — do NOT multiply again. */
  readonly returnPct: number
  readonly monthsCurtailed: number
  readonly totalBtcMined: number
  readonly totalTakeProfitUsdc: number
}

export type ProjectionsResponse = {
  readonly success: true
  readonly scenarios: readonly ProjectionRow[]
}

/** `GET /scenarios` — `data` is a fixed-key map of full results (~75 KB). */
export type ScenarioKey = 'flat' | 'btc100k' | 'btc150k' | 'btc200k' | 'worst50'

export type ScenariosResponse = {
  readonly success: true
  readonly data: Readonly<Record<ScenarioKey, MiningNoteResult>>
}

export type MonteCarloParams = {
  readonly spot: number
  readonly drift: number
  readonly volatility: number
  readonly months: number
  readonly paths: number
  readonly seed: number
}

export type MonteCarloResult = {
  readonly params: MonteCarloParams
  /** [path][month] = BTC PRICE path — NOT note value. */
  readonly paths: readonly (readonly number[])[]
  /** Per-month PRICE percentiles — same caveat as `paths`. */
  readonly percentiles: {
    readonly p5: readonly number[]
    readonly p10: readonly number[]
    readonly p25: readonly number[]
    readonly p50: readonly number[]
    readonly p75: readonly number[]
    readonly p90: readonly number[]
    readonly p95: readonly number[]
  }
  /** Fraction — e.g. 0.80. ×100 for display. */
  readonly capitalBackProbability: number
  /** Median NOTE VALUE at exit, USD. */
  readonly medianExit: number
  readonly cvar5: number
  readonly avgCurtailmentMonths: number
}

export type VsHoldingMonth = {
  readonly month: number
  readonly btcPrice: number
  readonly mining: {
    readonly btcTotal: number
    readonly btcMined: number
    readonly cashCostPerBtc: number | null
    readonly noteValueUsd: number
    readonly netReleasableUsd: number
  }
  readonly holding: {
    readonly btcTotal: number
    readonly valueUsd: number
  }
  readonly alphaUsd: number
  /** FRACTION vs hold value. */
  readonly alphaPct: number
  readonly alphaBtc: number
  /** >0 = mining cheaper this month. FRACTION. */
  readonly accumulationCheaperPct: number | null
}

export type VsHoldingResult = {
  readonly config: { capital: number; btcPriceStart: number; months: number; holdBtc: number }
  readonly months: readonly VsHoldingMonth[]
  readonly summary: {
    readonly holdBtc: number
    readonly totalBtcMined: number
    readonly monthsCurtailed: number
    readonly finalMiningNoteValueUsd: number
    readonly finalHoldValueUsd: number
    readonly finalAlphaUsd: number
    /** FRACTION (1.90 = +190 %). */
    readonly finalAlphaPct: number
    readonly finalMiningBtcTotal: number
    readonly finalAlphaBtc: number
    readonly breakEvenMonth: number | null
    readonly miningWins: boolean
    readonly costBasis: {
      readonly miningCashCostPerBtcAvg: number | null
      readonly allInCostPerMinedBtc: number | null
      readonly blendedCostPerBtcHeld: number | null
      readonly holdEntryPrice: number
      readonly avgSpotPrice: number
      /** FRACTIONS (0.76 = 76 % cheaper). */
      readonly allInDiscountVsAvgSpotPct: number | null
      readonly allInDiscountVsHoldEntryPct: number | null
      readonly blendedDiscountVsAvgSpotPct: number | null
      readonly capexMachines: number
      readonly buybackRecovered: number
      readonly totalElecPaid: number
    }
  }
}

/** `POST /sensitivity` — NOT wrapped in `data`. 11×9 grid, server takes seconds. */
export type SensitivityMetric = 'capitalBack' | 'medianReturn'

export type SensitivityResponse = {
  readonly success: true
  readonly drifts: readonly number[]
  readonly vols: readonly number[]
  /** [driftIndex][volIndex]. 0–1 probability for capitalBack, USD for medianReturn. */
  readonly grid: readonly (readonly number[])[]
  readonly metric: SensitivityMetric
}

export type MiningNoteRequest = {
  readonly capital: number
  readonly btcPriceStart: number
  readonly months: number
  readonly btcPricePath?: readonly number[]
}

/* ── Fetch helpers ───────────────────────────────────────────────────────── */

type ApiJson = {
  readonly success?: boolean
  readonly data?: unknown
  readonly error?: string
  readonly details?: string
}

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  pick: 'data' | 'raw' = 'data',
): Promise<T> {
  const res = await fetch(url, init)
  const json = (await res.json()) as ApiJson
  if (!res.ok || json.success === false) {
    throw new Error(json.error ?? `HTTP ${res.status} — ${url}`)
  }
  return (pick === 'data' ? json.data : json) as T
}

async function post<T>(url: string, body: object, pick: 'data' | 'raw' = 'data'): Promise<T> {
  return apiFetch<T>(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
    pick,
  )
}

/** Server-side (RSC): call the origin directly. */
export const miningNoteServer = {
  projections: () => apiFetch<ProjectionsResponse>(`${envBaseUrl}/api/mining-note/projections`, { cache: 'no-store' }, 'raw'),
  scenarios: () => apiFetch<ScenariosResponse['data']>(`${envBaseUrl}/api/mining-note/scenarios`, { cache: 'no-store' }),
  simulate: (req: MiningNoteRequest) => post<MiningNoteResult>(`${envBaseUrl}/api/mining-note/simulate`, req),
  vsHolding: (req: MiningNoteRequest) => post<VsHoldingResult>(`${envBaseUrl}/api/mining-note/vs-holding`, req),
}

/** Client-side: same-origin paths, tunneled by the Next rewrites. */
export const miningNoteRoutes = {
  simulate: '/api/mining-note/simulate',
  monteCarlo: '/api/mining-note/monte-carlo',
  sensitivity: '/api/mining-note/sensitivity',
  vsHolding: '/api/mining-note/vs-holding',
} as const
