import 'server-only'

import { callBackend, statusFromMeta } from '@/lib/backend/client'
import { availabilityFromResolved, type ResolvedBlock } from '@/lib/backend/availability'
import { measuredCount, type Availability, available, unavailable, valueOf} from '@/lib/vaults/model'

/**
 * Account dashboard loader — session-scoped, backend-first.
 *
 * Reads session read-models (auth: 'session', scoped to the connected account):
 * `me/portfolio` (Your position), `me/movements` (Your movements), the
 * `/api/v1/dashboard` aggregate (performance / subscription), `vault/history`
 * (value + allocation + BTC price series), `series1/events` (vault activity),
 * and `backtest/historical` (product performance). NOTHING is admin-wide.
 *
 * Login remains admin-gated today; this loader never invents an investor role.
 *
 * Every field is an `Availability<T>` produced by the canonical adapter — an
 * absent surface is a NAMED absence, never a zero, never a fabricated value
 * (doctrine `check:mocks` / `check:truthful-data`). Numeric strings from the
 * backend are parsed defensively; a non-finite parse drops the point.
 */

const DASHBOARD_ENDPOINT = '/api/v1/dashboard'
const PORTFOLIO_ENDPOINT = '/api/v1/me/portfolio'
const MOVEMENTS_ENDPOINT = '/api/v1/me/movements'
const HISTORY_ENDPOINT = '/api/v1/vault/history'
const SERIES1_ENDPOINT = '/api/v1/series1/events'
const BACKTEST_ENDPOINT = '/api/v1/backtest/historical'
const VAULT_ENDPOINT = '/api/v1/vault'
const FACTSHEET_ENDPOINT = '/api/v1/product/factsheet'
const BTC_ENDPOINT = '/api/v1/btc'
const MARKET_SNAPSHOT_ENDPOINT = '/api/v1/admin/market/snapshot'
const VAULT_ACCOUNT_ENDPOINT = '/api/v1/me/vault'
const PROJECTION_ENDPOINT = '/api/v1/me/vault/projection'
const PRODUCTION_COST_ENDPOINT = '/api/v1/mining/production-cost'
const FLEET_ENDPOINT = '/api/v1/mining/fleet'
const DISTRIBUTIONS_ENDPOINT = '/api/v1/mining/distributions'
const BUCKET_YIELDS_ENDPOINT = '/api/v1/vault/bucket-yields'

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
/**
 * Un point de l'allocation dans le temps : la part de CHAQUE poche.
 *
 * Le modèle précédent ne portait que deux séries, cbBTC et USDC — un découpage
 * qui ne correspond à aucune poche du produit (Basis carry, RWA T-bills, Mining
 * alpha). Le filtre par nom ne trouvait rien et la vue restait vide.
 */
type AllocationTimePoint = {
  readonly label: string
  readonly detail: string
  /** Part de chaque poche, indexée par son libellé. Somme ≈ 100. */
  readonly shares: Readonly<Record<string, number>>
}
type BtcPoint = { readonly label: string; readonly value: number; readonly detail: string }
type ActivityBar = { readonly label: string; readonly value: number; readonly detail: string }
type BacktestRun = { readonly label: string; readonly value: number; readonly detail: string }
export type ExposurePocket = {
  readonly label: string
  readonly targetPct: number
  readonly actualPct: number | null
}
/**
 * A single, honest point-in-time reading — NOT a time series. The backend
 * exposes no history for network difficulty or hashprice (only a snapshot),
 * so the BTC context flank never builds a sparkline for these two fields —
 * a mini-chart drawn from a single point would be a fabricated trend.
 */
export type MarketSnapshot = {
  readonly btcUsd: number | null
  readonly btcChange24hPct: number | null
  readonly hashprice: number | null
  readonly difficulty: number | null
  readonly asOf: string | null
}
/**
 * Position convertie en BTC au cours spot.
 *
 * DÉRIVÉE, jamais lue au book : le backend tient la position en USDC entiers.
 * `source: 'derived'` doit rester visible à l'écran — présenter ce chiffre comme
 * un solde BTC détenu serait un mensonge : le vault ne détient pas ce bitcoin.
 * Quand la réserve BTC existera côté backend, cette dérivation cède la place à
 * une lecture réelle et le drapeau passe à 'book'.
 */
export type BtcEquivalent = {
  readonly btc: number
  readonly rateUsd: number
  readonly source: 'derived'
}

/**
 * Comparaison au simple fait d'avoir gardé ses bitcoins.
 *
 * C'est le référentiel d'un client dont le métier est le bitcoin : un vault qui
 * sert 8 % en dollars pendant que le BTC prend 25 % lui fait PERDRE des sats.
 * Le produit ne montrait ce chiffre nulle part — ni au client, ni en interne.
 *
 * `heldBtc`   : sats que vaut la position d'aujourd'hui, au spot.
 * `hodlBtc`   : sats qu'on aurait en ayant converti le principal à l'entrée.
 * `deltaPct`  : écart relatif — négatif = le produit fait moins bien que HODL.
 *
 * DÉRIVÉ de bout en bout, comme `BtcEquivalent` : le vault ne détient pas ces
 * bitcoins. Le cours d'entrée vient du plus ancien point de `btcSeries`, donc
 * la comparaison porte sur la fenêtre couverte par l'historique — pas depuis la
 * souscription si celle-ci lui est antérieure. `windowLabel` le dit à l'écran.
 */
export type BtcVsHodl = {
  readonly heldBtc: number
  readonly hodlBtc: number
  readonly deltaPct: number
  readonly entryRateUsd: number
  readonly spotRateUsd: number
  readonly windowLabel: string
}

export type UserMovement = {
  readonly id: string
  readonly title: string
  readonly detail: string | null
  /** On-chain transaction hash, when the source carries one. Sert la
   *  vérifiabilité du mouvement — pas de lien explorateur, aucune URL n'est
   *  câblée côté produit. */
  readonly txHash: string | null
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
  /** Investor position lifecycle status from the book record. */
  readonly positionStatus: Availability<string>
  /** ISO timestamp when the investor subscribed (book record). */
  readonly positionSubscribedAt: Availability<string>
  /** Position value converted to BTC at spot — derived, never a held balance. */
  readonly positionBtc: Availability<BtcEquivalent>
  /** Accrued yield converted to BTC at spot — what the reserve would hold. */
  readonly accruedBtc: Availability<BtcEquivalent>
  /** Position measured against simply having held bitcoin over the window. */
  readonly btcVsHodl: Availability<BtcVsHodl>
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
  /** Vault AUM at the latest snapshot (whole USDC) — sizes each pocket. */
  readonly vaultAum: Availability<number>
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
  /** BTC/hashprice/difficulty point-in-time reading — global market context,
   *  never the vault's own data. See `MarketSnapshot` for why it carries no
   *  history. */
  readonly marketSnapshot: Availability<MarketSnapshot>
  /** Cumulative BTC produced by the product, in whole BTC (from `btc.btcProduced`). */
  readonly btcProducedTotal: Availability<number>
  /** The investor's OWN vault — dedicated, never a share of a pool. */
  readonly vaultAccount: Availability<VaultAccount>
  /** Monte-Carlo bands on the vault value. */
  readonly projection: Availability<VaultProjection>
  /** What producing one BTC costs today, against the market. */
  readonly productionCost: Availability<ProductionCost>
  /** Current run-rate yield per strategy bucket. */
  readonly bucketYields: Availability<readonly BucketYield[]>
  /** The compute fleet the vault gives access to — fleet-wide, never a share. */
  readonly fleet: Availability<ComputeFleet>
  /** Monthly distributions, most recent first. */
  readonly distributions: Availability<readonly Distribution[]>
}

/**
 * Une distribution mensuelle.
 *
 * `status` sépare ce qui est PAYÉ de ce qui est seulement annoncé : une ligne
 * `pending` n'est pas de l'argent reçu, et l'écran ne doit jamais les confondre.
 */
export type Distribution = {
  readonly id: string
  readonly month: string
  readonly paidAt: string | null
  readonly amountUsdc: number | null
  readonly btcAmount: number | null
  readonly btcPriceUsd: number | null
  readonly status: 'distributed' | 'approved' | 'pending'
}

/**
 * Parc de calcul. Mesures à l'échelle de TOUTE l'infrastructure : c'est la
 * capacité industrielle à laquelle le vault donne accès, pas une quote-part.
 */
export type ComputeFleet = {
  readonly minersManaged: number | null
  readonly hashrateEhs: number | null
  /** BTC produits depuis l'origine, à l'échelle du parc. */
  readonly btcProducedTotal: number | null
  readonly countries: number | null
  readonly uptimePct: number | null
  readonly asOf: string | null
}

/**
 * Vault dédié du client. Le produit n'est PAS un pool partagé : ces montants
 * sont ceux de son vault à lui, pas une quote-part.
 */
export type VaultAccount = {
  readonly vaultId: string
  readonly label: string
  readonly principalUsdc: number
  /** Cumul déjà retiré depuis l'ouverture. */
  readonly withdrawnUsdc: number
  /** Distribution du mois, retirable maintenant. */
  readonly availableUsdc: number
  readonly nextDistributionAt: string | null
  /** Début du blocage du capital. Null quand la source ne le publie pas. */
  readonly lockupStartAt: string | null
  /** Durée du blocage, en mois. */
  readonly lockupMonths: number | null
  /** Le dépôt reste fermé tant que l'admin ne l'a pas ouvert. L'interface REFLÈTE
   *  cette décision, elle ne l'accorde jamais. */
  readonly depositUnlocked: boolean
  readonly withdrawUnlocked: boolean
}

/** Un point de la projection : la médiane et ses bandes. */
export type ProjectionPoint = {
  readonly label: string
  readonly p10: number
  readonly p25: number
  readonly p50: number
  readonly p75: number
  readonly p90: number
  /** Contrevaleur bitcoin — dépend AUSSI du cours, d'où une fourchette bien
   *  plus large que celle en dollars. Absente si la source ne la publie pas. */
  readonly btcP10: number | null
  readonly btcP50: number | null
  readonly btcP90: number | null
}

export type VaultProjection = {
  readonly runs: number
  readonly horizonMonths: number
  readonly startValueUsdc: number
  readonly startValueBtc: number | null
  /** Volatilité annualisée retenue pour le cours, en points de pourcentage. */
  readonly btcVolAnnualPct: number | null
  readonly points: readonly ProjectionPoint[]
}

/**
 * Coût de production d'un bitcoin, contre son prix de marché. L'écart entre les
 * deux est la marge : c'est LUI qui dit si le minage crée de la valeur.
 */
export type ProductionCost = {
  readonly costPerBtcUsd: number
  readonly marketPriceUsd: number
  readonly marginPct: number
  readonly electricityUsdPerKwh: number | null
  readonly networkDifficulty: number | null
  readonly hashrateEhs: number | null
  readonly asOf: string | null
}

/** Rendement courant d'une poche, annualisé — un run-rate, pas un réalisé. */
export type BucketYield = {
  readonly bucket: string
  readonly yieldPct: number
  readonly capitalUsdc: number
  readonly trendPct: number | null
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
  const points = snaps.flatMap((s): readonly AllocationTimePoint[] => {
    const shares: Record<string, number> = {}
    for (const a of s.allocations ?? []) {
      const pct = num(a.pct)
      // Une poche sans part lisible est ÉCARTÉE, pas mise à zéro : un zéro se
      // tracerait comme un désinvestissement qui n'a pas eu lieu.
      if (typeof a.bucket === 'string' && pct !== null) shares[a.bucket] = pct
    }
    if (Object.keys(shares).length === 0) return []
    const label = dayLabel(s.takenAt)
    return [{ label, detail: label, shares }]
  })
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

/** Point-in-time market reading from `admin/market/snapshot`'s nested `snapshot` field. */
/**
 * Nombre avec suffixe d'échelle : la difficulté arrive en « 92.05T », que
 * `Number()` lit `NaN` — la métrique s'affichait donc « — » alors que la source
 * la publiait. Les suffixes sont ceux du réseau bitcoin (kilo → exa).
 */
function scaledNum(value: unknown): number | null {
  const direct = num(value)
  if (direct !== null) return direct
  if (typeof value !== 'string') return null
  const match = /^\s*(-?[\d.]+)\s*([KMGTPE])\s*$/i.exec(value)
  if (match === null) return null
  const base = Number(match[1])
  if (!Number.isFinite(base)) return null
  const scale: Record<string, number> = { K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18 }
  return base * (scale[match[2].toUpperCase()] ?? 1)
}

function marketSnapshotFrom(field: ResolvedField | null): MarketSnapshot | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  return {
    btcUsd: num(r.btcUsd),
    btcChange24hPct: num(r.btcChange24hPct),
    hashprice: num(r.hashprice),
    difficulty: scaledNum(r.difficulty),
    asOf: typeof r.asOf === 'string' ? r.asOf : null,
  }
}

/**
 * Vault dédié. Un champ manquant fait tomber TOUT le bloc : afficher un
 * principal sans savoir ce qui a été retiré donnerait une lecture fausse du
 * capital restant. Les deux drapeaux d'autorisation, eux, se lisent fermés par
 * défaut — une permission absente n'est pas une permission accordée.
 */
function vaultAccountFrom(field: ResolvedField | null): VaultAccount | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const principalUsdc = num(r.principalUsdc)
  const withdrawnUsdc = num(r.withdrawnUsdc)
  const availableUsdc = num(r.availableUsdc)
  if (principalUsdc === null || withdrawnUsdc === null || availableUsdc === null) return null
  return {
    vaultId: typeof r.vaultId === 'string' ? r.vaultId : 'vault',
    label: typeof r.label === 'string' ? r.label : 'Dedicated vault',
    principalUsdc,
    withdrawnUsdc,
    availableUsdc,
    nextDistributionAt: typeof r.nextDistributionAt === 'string' ? r.nextDistributionAt : null,
    lockupStartAt: typeof r.lockupStartAt === 'string' ? r.lockupStartAt : null,
    lockupMonths: num(r.lockupMonths),
    depositUnlocked: r.depositUnlocked === true,
    withdrawUnlocked: r.withdrawUnlocked === true,
  }
}

/** Projection Monte-Carlo. Un point dont un percentile manque est écarté :
 *  une bande à trou se tracerait en ligne droite et mentirait sur l'incertitude. */
function projectionFrom(field: ResolvedField | null): VaultProjection | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.points)) return null
  const points = r.points.flatMap((p): readonly ProjectionPoint[] => {
    if (typeof p !== 'object' || p === null) return []
    const q = p as Record<string, unknown>
    const [p10, p25, p50, p75, p90] = [q.p10, q.p25, q.p50, q.p75, q.p90].map(num)
    if (p10 === null || p25 === null || p50 === null || p75 === null || p90 === null) return []
    return [
      {
        label: typeof q.label === 'string' ? q.label : '',
        p10,
        p25,
        p50,
        p75,
        p90,
        // Lecture bitcoin : optionnelle. Une source qui ne la publie pas laisse
        // le tableau en dollars seuls plutôt que d'inventer une conversion.
        btcP10: num(q.btcP10),
        btcP50: num(q.btcP50),
        btcP90: num(q.btcP90),
      },
    ]
  })
  if (points.length < 2) return null
  return {
    runs: num(r.runs) ?? 0,
    horizonMonths: num(r.horizonMonths) ?? points.length - 1,
    startValueUsdc: num(r.startValueUsdc) ?? points[0].p50,
    startValueBtc: num(r.startValueBtc),
    btcVolAnnualPct: num(r.btcVolAnnualPct),
    points,
  }
}

/** Coût de production. Sans le coût NI le prix de marché, il n'y a pas d'écart
 *  à montrer — donc rien à afficher. */
function productionCostFrom(field: ResolvedField | null): ProductionCost | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const costPerBtcUsd = num(r.costPerBtcUsd)
  const marketPriceUsd = num(r.marketPriceUsd)
  if (costPerBtcUsd === null || marketPriceUsd === null) return null
  return {
    costPerBtcUsd,
    marketPriceUsd,
    // La marge est RECALCULÉE et non lue : deux sources pour un même fait
    // finissent toujours par diverger.
    marginPct: marketPriceUsd > 0 ? ((marketPriceUsd - costPerBtcUsd) / marketPriceUsd) * 100 : 0,
    electricityUsdPerKwh: num(r.electricityUsdPerKwh),
    networkDifficulty: num(r.networkDifficulty),
    hashrateEhs: num(r.hashrateEhs),
    asOf: typeof r.asOf === 'string' ? r.asOf : null,
  }
}

/** Rendements par poche. Une poche sans taux lisible est écartée, pas mise à zéro. */
function bucketYieldsFrom(field: ResolvedField | null): readonly BucketYield[] | null {
  const raw = field?.value
  if (!Array.isArray(raw)) return null
  const rows = raw.flatMap((b): readonly BucketYield[] => {
    if (typeof b !== 'object' || b === null) return []
    const r = b as Record<string, unknown>
    const yieldPct = num(r.yieldPct)
    if (typeof r.bucket !== 'string' || yieldPct === null) return []
    return [{ bucket: r.bucket, yieldPct, capitalUsdc: num(r.capitalUsdc) ?? 0, trendPct: num(r.trendPct) }]
  })
  return rows.length > 0 ? rows : null
}

/**
 * Parc de calcul. Chaque mesure est indépendante — une métrique illisible en
 * laisse quatre affichables, là où un rejet global viderait le bloc entier.
 * Le bloc n'est absent que si RIEN n'est lisible.
 */
function fleetFrom(field: ResolvedField | null): ComputeFleet | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const fleet: ComputeFleet = {
    minersManaged: num(r.minersManaged),
    hashrateEhs: num(r.hashrateEhs),
    btcProducedTotal: num(r.btcProducedTotal),
    countries: num(r.countries),
    uptimePct: num(r.uptimePct),
    asOf: typeof r.asOf === 'string' ? r.asOf : null,
  }
  const readable =
    fleet.minersManaged !== null ||
    fleet.hashrateEhs !== null ||
    fleet.btcProducedTotal !== null ||
    fleet.countries !== null
  return readable ? fleet : null
}

/** Distributions mensuelles. Une ligne sans montant lisible est écartée. */
function distributionsFrom(field: ResolvedField | null): readonly Distribution[] | null {
  const raw = field?.value
  if (!Array.isArray(raw)) return null
  const rows = raw.flatMap((d): readonly Distribution[] => {
    if (typeof d !== 'object' || d === null) return []
    const r = d as Record<string, unknown>
    const amountUsdc = num(r.yieldUsdc)
    if (typeof r.month !== 'string' || amountUsdc === null) return []
    const sats = num(r.btcAmountSats)
    const status =
      r.status === 'distributed' || r.status === 'approved' ? r.status : 'pending'
    return [
      {
        id: typeof r.id === 'string' ? r.id : r.month,
        month: r.month,
        paidAt: typeof r.distributionDate === 'string' ? r.distributionDate : null,
        amountUsdc,
        btcAmount: sats === null ? null : sats / 100_000_000,
        btcPriceUsd: num(r.btcPriceUsdc),
        status,
      },
    ]
  })
  // Plus récent d'abord : l'ordre de lecture d'un relevé.
  return rows.length > 0 ? [...rows].reverse() : null
}

/** Cumulative BTC produced (whole BTC) from `btc.btcProduced.totalSats`. */
function btcProducedTotalFrom(field: ResolvedField | null): number | null {
  const raw = field?.value
  if (typeof raw !== 'object' || raw === null) return null
  const sats = num((raw as Record<string, unknown>).totalSats)
  return sats === null ? null : sats / 100_000_000
}

function minDepositFrom(factsheetData: unknown): number | null {
  const terms = envelopeField(factsheetData, 'terms').value as Record<string, unknown> | null
  // `minimumDepositUsdc` is whole USDC (registry caveat, endpoints.ts) — no atomic divisor.
  return num(terms?.minimumDepositUsdc)
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
      const txHash = typeof row.txHash === 'string' && row.txHash !== '' ? row.txHash : null
      return { id, title, detail, txHash, amountUsdc, occurredAt }
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
 * The CLIENT's own position book values from `me/portfolio` (InvestorPosition).
 * These are backend book figures in whole USDC — `value` = principal + accrued —
 * NOT a mark-to-market. `shares` is null (the DB holds no share balance), so a
 * client value is never computed as shares × NAV. Absent → null (never 0).
 */
function positionBookFrom(field: ResolvedField | null, key: 'value' | 'principal' | 'accrued'): number | null {
  const pos = field?.value
  if (typeof pos !== 'object' || pos === null) return null
  return num((pos as Record<string, unknown>)[key])
}

function positionTextFrom(field: ResolvedField | null, key: string): string | null {
  const pos = field?.value
  if (typeof pos !== 'object' || pos === null) return null
  const raw = (pos as Record<string, unknown>)[key]
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : null
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
    portfolioResponse,
    movementsResponse,
    btcResponse,
    marketSnapshotResponse,
    vaultAccountResponse,
    projectionResponse,
    productionCostResponse,
    bucketYieldsResponse,
    fleetResponse,
    distributionsResponse,
  ] = await Promise.all([
    callBackend<Record<string, unknown>>('dashboard'),
    callBackend<unknown>('vault-history'),
    callBackend<unknown>('series1-events'),
    callBackend<unknown>('backtest-historical'),
    callBackend<unknown>('vault'),
    callBackend<unknown>('product-factsheet'),
    callBackend<Record<string, unknown>>('me-portfolio'),
    callBackend<Record<string, unknown>>('me-movements'),
    callBackend<Record<string, unknown>>('btc'),
    callBackend<Record<string, unknown>>('admin-market-snapshot'),
    callBackend<Record<string, unknown>>('me-vault'),
    callBackend<Record<string, unknown>>('me-vault-projection'),
    callBackend<Record<string, unknown>>('mining-production-cost'),
    callBackend<Record<string, unknown>>('vault-bucket-yields'),
    callBackend<Record<string, unknown>>('mining-fleet'),
    callBackend<Record<string, unknown>>('mining-distributions'),
  ])

  const aggregate = aggregateResponse.ok ? aggregateResponse.data : null
  const sourceStatus = aggregateResponse.ok ? statusFromMeta(aggregateResponse.meta) : 'UNAVAILABLE'

  const portfolio = portfolioResponse.ok ? portfolioResponse.data : null
  const positionRF = surface(portfolio, 'position')
  const position = availabilityFromResolved(positionRF, PORTFOLIO_ENDPOINT)
  // Client book values — the account's OWN money, per-client at the query layer.
  // Sourced from `me/portfolio`, never derived from the fund-wide dashboard.
  // value = principal + accrued (book), shares stay null.
  const positionValue = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'value'), reason: 'no_investor_position' },
    PORTFOLIO_ENDPOINT,
  )
  const positionPrincipal = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'principal'), reason: 'no_investor_position' },
    PORTFOLIO_ENDPOINT,
  )
  const positionAccrued = availabilityFromResolved<number>(
    { status: positionRF.status, value: positionBookFrom(positionRF.value, 'accrued'), reason: 'no_investor_position' },
    PORTFOLIO_ENDPOINT,
  )
  const positionStatus = availabilityFromResolved<string>(
    { status: positionRF.status, value: positionTextFrom(positionRF.value, 'status'), reason: 'no_investor_position' },
    PORTFOLIO_ENDPOINT,
  )
  const positionSubscribedAt = availabilityFromResolved<string>(
    { status: positionRF.status, value: positionTextFrom(positionRF.value, 'subscribedAt'), reason: 'no_investor_position' },
    PORTFOLIO_ENDPOINT,
  )
  const performance = availabilityFromResolved(surface(aggregate, 'performance'), DASHBOARD_ENDPOINT)
  const subscription = availabilityFromResolved(surface(aggregate, 'subscription'), DASHBOARD_ENDPOINT)

  // Account movements are the CALLER's own investor activity from `me/movements`.
  // The global `recentEvents` vault feed must NEVER stand in for it: a fallback
  // there would present fund-wide events under a personal label (the P0 tenant-
  // truth defect). Client activity absent → the section reports UNAVAILABLE;
  // present-but-empty → EMPTY. Global data never silently becomes client data.
  const movements = movementsResponse.ok ? movementsResponse.data : null
  const activityField = surface(movements, 'movements')
  const activitySourceStatus = activityField.status
  const activityValue = movementsFrom(activityField.value)
  const activity = availabilityFromResolved<readonly UserMovement[]>(
    { status: activitySourceStatus, value: activityValue, reason: 'no_investor_movement' },
    MOVEMENTS_ENDPOINT,
  )
  const activityCount = measuredCount(activity)
  const activityByType = availabilityFromResolved<readonly AllocationBar[]>(
    { status: activitySourceStatus, value: activityByTypeFrom(activityValue), reason: 'no_investor_movement' },
    MOVEMENTS_ENDPOINT,
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

  // AUM courant = dernier point de la série de valeur. Sert à chiffrer chaque
  // poche : le factsheet donne des pourcentages, pas des montants.
  const aumPoints = valueSeriesFrom(snaps)
  const vaultAum = availabilityFromResolved<number>(
    {
      status: historyStatus,
      value: aumPoints !== null && aumPoints.length > 0 ? aumPoints[aumPoints.length - 1].value : null,
      reason: 'no_history',
    },
    HISTORY_ENDPOINT,
  )
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

  // Global BTC/network context — never the vault's own data. `admin-market-
  // snapshot` requires the backend `admin` role; today's single login path is
  // admin-gated so the call succeeds, but a future investor-only role would
  // make it a named PERMISSION_DENIED absence, never a fabricated reading.
  const btcAggregate = btcResponse.ok ? btcResponse.data : null
  const btcProducedField = surface(btcAggregate, 'btcProduced')
  const btcProducedTotal = availabilityFromResolved<number>(
    { status: btcProducedField.status, value: btcProducedTotalFrom(btcProducedField.value), reason: 'no_btc_produced' },
    BTC_ENDPOINT,
  )

  const marketAggregate = marketSnapshotResponse.ok ? marketSnapshotResponse.data : null
  const marketSnapshotField = surface(marketAggregate, 'snapshot')
  const marketSnapshot = availabilityFromResolved<MarketSnapshot>(
    {
      status: marketSnapshotField.status,
      value: marketSnapshotFrom(marketSnapshotField.value),
      reason: 'no_market_snapshot',
    },
    MARKET_SNAPSHOT_ENDPOINT,
  )

  // ── Vault dédié, projection, minage ───────────────────────────────────────
  // Chaque source est indépendante : l'absence de l'une n'efface pas les autres.
  const readField = (
    resp: { ok: boolean; data?: Record<string, unknown> },
    key: string,
  ): ResolvedBlock<ResolvedField> =>
    resp.ok ? surface(resp.data ?? null, key) : { status: 'UNAVAILABLE', value: null, reason: 'unreachable' }

  const vaultAccountField = readField(vaultAccountResponse, 'vault')
  const vaultAccount = availabilityFromResolved<VaultAccount>(
    { status: vaultAccountField.status, value: vaultAccountFrom(vaultAccountField.value), reason: 'no_vault_account' },
    VAULT_ACCOUNT_ENDPOINT,
  )

  const projectionField = readField(projectionResponse, 'projection')
  const projection = availabilityFromResolved<VaultProjection>(
    { status: projectionField.status, value: projectionFrom(projectionField.value), reason: 'no_projection' },
    PROJECTION_ENDPOINT,
  )

  const productionCostField = readField(productionCostResponse, 'productionCost')
  const productionCost = availabilityFromResolved<ProductionCost>(
    { status: productionCostField.status, value: productionCostFrom(productionCostField.value), reason: 'no_production_cost' },
    PRODUCTION_COST_ENDPOINT,
  )

  const bucketYieldsField = readField(bucketYieldsResponse, 'bucketYields')
  const bucketYields = availabilityFromResolved<readonly BucketYield[]>(
    { status: bucketYieldsField.status, value: bucketYieldsFrom(bucketYieldsField.value), reason: 'no_bucket_yields' },
    BUCKET_YIELDS_ENDPOINT,
  )

  const fleetField = readField(fleetResponse, 'fleet')
  const fleet = availabilityFromResolved<ComputeFleet>(
    { status: fleetField.status, value: fleetFrom(fleetField.value), reason: 'no_fleet' },
    FLEET_ENDPOINT,
  )

  const distributionsField = readField(distributionsResponse, 'distributions')
  const distributions = availabilityFromResolved<readonly Distribution[]>(
    { status: distributionsField.status, value: distributionsFrom(distributionsField.value), reason: 'no_distributions' },
    DISTRIBUTIONS_ENDPOINT,
  )

  // ── Équivalent BTC ────────────────────────────────────────────────────────
  // Le book est en USDC ; la réserve BTC n'existe pas encore côté backend. On
  // convertit donc au spot pour donner au client son référentiel — en marquant
  // la valeur comme dérivée. Sans cours disponible, c'est une absence nommée :
  // jamais un montant BTC inventé à partir d'un taux supposé.
  const spotUsd = valueOf(marketSnapshot)?.btcUsd ?? null

  const toBtc = (usdc: Availability<number>): Availability<BtcEquivalent> => {
    const usd = valueOf(usdc)
    if (usd === null || spotUsd === null || spotUsd <= 0) {
      return unavailable({
        endpoint: MARKET_SNAPSHOT_ENDPOINT,
        reason: usd === null ? 'no_investor_position' : 'no_btc_rate',
      })
    }
    return available(
      { btc: usd / spotUsd, rateUsd: spotUsd, source: 'derived' as const },
      // 'unknown' : ni lu en base ni sur la chaîne — c'est un calcul du front.
      { provenance: 'unknown', stale: false, asOf: null },
    )
  }

  const positionBtc = toBtc(positionValue)
  const accruedBtc = toBtc(positionAccrued)

  // ── Comparaison au HODL ───────────────────────────────────────────────────
  // Le chiffre que la note de cadrage dit manquant : ce que la position vaut en
  // sats, contre les sats qu'on aurait eus en convertissant le principal à
  // l'entrée. Le cours d'entrée est le plus ANCIEN point de `btcSeries` — donc
  // la fenêtre est celle de l'historique, pas celle de la souscription. Deux
  // absences nommées et distinctes : pas de position, ou pas d'historique de
  // cours exploitable. Jamais de comparaison bâtie sur un taux supposé.
  const btcVsHodl = ((): Availability<BtcVsHodl> => {
    const principal = valueOf(positionPrincipal)
    const current = valueOf(positionValue)
    const points = valueOf(btcSeries)

    if (principal === null || current === null) {
      return unavailable({ endpoint: PORTFOLIO_ENDPOINT, reason: 'no_investor_position' })
    }
    if (spotUsd === null || spotUsd <= 0 || points === null || points.length < 2) {
      return unavailable({ endpoint: HISTORY_ENDPOINT, reason: 'no_btc_history' })
    }

    const entryRateUsd = points[0].value
    if (!Number.isFinite(entryRateUsd) || entryRateUsd <= 0) {
      return unavailable({ endpoint: HISTORY_ENDPOINT, reason: 'no_btc_history' })
    }

    const heldBtc = current / spotUsd
    const hodlBtc = principal / entryRateUsd
    if (hodlBtc <= 0) {
      return unavailable({ endpoint: PORTFOLIO_ENDPOINT, reason: 'no_investor_position' })
    }

    return available(
      {
        heldBtc,
        hodlBtc,
        deltaPct: (heldBtc / hodlBtc - 1) * 100,
        entryRateUsd,
        spotRateUsd: spotUsd,
        windowLabel: `${points[0].label} → ${points[points.length - 1].label}`,
      },
      // Calcul du front sur deux sources lues : ni book, ni chaîne.
      { provenance: 'unknown', stale: false, asOf: null },
    )
  })()

  return {
    distributions,
    fleet,
    vaultAccount,
    projection,
    productionCost,
    bucketYields,
    sourceStatus,
    position,
    positionBtc,
    accruedBtc,
    btcVsHodl,
    positionValue,
    positionPrincipal,
    positionAccrued,
    positionStatus,
    positionSubscribedAt,
    performance,
    subscription,
    allocationBars,
    allocationSeries,
    valueSeries,
    btcSeries,
    activityBars,
    backtestRuns,
    exposure,
    vaultAum,
    navPerShare,
    utilizationPct,
    availableCapacity,
    minimumDeposit,
    activityByType,
    activity,
    activityCount,
    marketSnapshot,
    btcProducedTotal,
  }
}
