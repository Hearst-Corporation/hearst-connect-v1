/**
 * Centralized number/currency/date formatting — single locale, single source of truth.
 * A missing or non-finite value renders '—' (or `null` for address/hash helpers, so the
 * caller can decide to render nothing) — it never silently becomes a zero.
 */

const LOCALE = 'en-US'

export function formatNumber(value: number | null | undefined, opts?: Intl.NumberFormatOptions): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString(LOCALE, opts)
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

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString(LOCALE, { notation: 'compact', maximumFractionDigits: 1 })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'date inconnue'
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 'date inconnue' : new Date(t).toLocaleDateString(LOCALE, { dateStyle: 'medium' })
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'date inconnue'
  const t = Date.parse(iso)
  return Number.isNaN(t) ? 'date inconnue' : new Date(t).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' })
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const minutes = Math.round((Date.now() - t) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return days < 31 ? `il y a ${days} j` : `il y a ${Math.round(days / 30)} mois`
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
