/**
 * Centralized number/currency/date formatting — single locale, single source of truth.
 * A missing or non-finite value renders '—' (or `null` for address/hash helpers, so the
 * caller can decide to render nothing) — it never silently becomes a zero.
 */

const LOCALE = 'en-US'

/** English count suffix: 1 → '' ; otherwise → 's' (e.g. vault / vaults). */
export function pluralSuffix(count: number): string {
  return count === 1 ? '' : 's'
}

/** Irregular strategy suffix: 1 → 'y' ; otherwise → 'ies'. */
export function strategySuffix(count: number): string {
  return count === 1 ? 'y' : 'ies'
}

export function formatNumber(value: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString(LOCALE, opts)
}

/**
 * Montant en bitcoin — DEUX décimales, partout.
 *
 * Le produit se lit en BTC : les montants doivent donc s'écrire de la même
 * façon d'un bloc à l'autre, sans quoi l'œil compare des nombres qui n'ont pas
 * la même précision (3 décimales ici, 4 là, 6 ailleurs).
 *
 * `withUnit` ajoute le suffixe « BTC » : la plupart des surfaces le veulent,
 * quelques-unes portent l'unité à côté du chiffre dans un `<span>` distinct.
 */
export function formatBtc(
  value: number | null | undefined,
  opts?: { withUnit?: boolean },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const n = value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return opts?.withUnit === false ? n : `${n} BTC`
}

export function formatPercent(
  value: number | null | undefined,
  opts?: { fromBps?: boolean; maximumFractionDigits?: number; signed?: boolean },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const pct = opts?.fromBps ? value / 100 : value
  const sign = opts?.signed && pct > 0 ? '+' : ''
  return `${sign}${pct.toLocaleString(LOCALE, { maximumFractionDigits: opts?.maximumFractionDigits ?? 1 })}%`
}

/** Allocation drift in percentage points (100 bps = 1 pt). */
export function formatDriftPts(driftBps: number | null | undefined): string {
  if (driftBps === null || driftBps === undefined || !Number.isFinite(driftBps)) return '—'
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString(LOCALE, { maximumFractionDigits: 2 })} pt`
}

export function formatCurrency(
  atomic: string | number | null | undefined,
  opts?: { decimals?: number; unit?: string; fromAtomic?: number },
): string {
  if (atomic === null || atomic === undefined || atomic === '') return '—'
  const raw = typeof atomic === 'string' ? Number(atomic) : atomic
  if (!Number.isFinite(raw)) return '—'
  const value = raw / (opts?.fromAtomic ?? 1_000_000)
  return `${opts?.unit ?? '$'}${value.toLocaleString(LOCALE, { maximumFractionDigits: opts?.decimals ?? 2 })}`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Date seule, sans heure — pour les faits dont l'heure n'apporte rien (date de
 * souscription, échéance). `formatDateTime` reste la forme complète.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '—' : new Date(t).toLocaleDateString(LOCALE, { dateStyle: 'medium' })
}

/**
 * Ancienneté relative — « 3 h ago », « Yesterday ».
 *
 * ATTENTION : dépend de `Date.now()`, donc le serveur et le navigateur n'en
 * produisent pas le même texte, et React rejette l'hydratation. Réservé aux
 * composants client montés après l'hydratation (`useEffect`, interaction).
 *
 * Pour un rendu serveur — la grande majorité des surfaces admin — utiliser
 * `formatDate` : une date absolue dit de toute façon mieux QUAND un fait s'est
 * produit qu'une ancienneté approximative.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const minutes = Math.round((Date.now() - t) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  return days < 31 ? `${days} d ago` : `${Math.round(days / 30)} mo ago`
}

export function formatAddress(address: string | null | undefined): string | null {
  if (!address) return null
  return address.length < 12 ? address : `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatHash(hash: string | null | undefined, opts?: { headLength?: number }): string | null {
  if (!hash) return null
  const head = opts?.headLength ?? 6
  return hash.length < head + 6 ? hash : `${hash.slice(0, head)}…${hash.slice(-4)}`
}
