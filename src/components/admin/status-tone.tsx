import clsx from 'clsx'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/**
 * Admin status / badge tones — semantic Hearst tokens only.
 *
 * Never pass Catalyst raw palettes (`lime` / `green` / `amber` / `red` / `rose`)
 * from product surfaces. Map the business meaning here, then render via
 * `AdminToneBadge`.
 *
 * `accent` = ordinary healthy / indexed (brand mint) — not an alarm.
 * `ok`     = positive semantic claim (LIVE freshness, KYC approved).
 * `warn`   = attention (pending, stale, simulated).
 * `bad`    = failure / denial / unavailable.
 */

export type AdminBadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent'

export const ADMIN_TONE_CLASS: Record<AdminBadgeTone, string> = {
  ok: 'bg-success-400/15 text-success-400 ring-success-400/30',
  warn: 'bg-warning-400/15 text-warning-400 ring-warning-400/30',
  bad: 'bg-danger-400/20 text-danger-400 ring-danger-400/40',
  info: 'bg-white/5 text-fg ring-console-line-strong',
  neutral: 'bg-white/5 text-fg-secondary ring-console-line-strong',
  accent: 'bg-accent-400/15 text-accent-400 ring-accent-400/30',
}

export function AdminToneBadge({
  tone,
  children,
  className,
  showDot = false,
  ...rest
}: Readonly<{
  tone: AdminBadgeTone
  children: ReactNode
  className?: string
  showDot?: boolean
}> &
  ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        ADMIN_TONE_CLASS[tone],
        className,
      )}
      {...rest}
    >
      {showDot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

function keyOf(status: string): string {
  return status.trim().toUpperCase()
}

/** Operational / indexer event status (activity, operations). */
export function toneForActivityStatus(status: string): AdminBadgeTone {
  const key = keyOf(status)
  if (key === 'CONFIRMED' || key === 'INDEXED' || key === 'LIVE') return 'accent'
  if (key === 'REQUESTED' || key === 'PENDING' || key === 'PARTIAL' || key === 'STALE') return 'warn'
  if (key === 'FAILED' || key === 'DENIED' || key === 'PERMISSION_DENIED' || key === 'ERROR') return 'bad'
  if (key === 'NOT_SUPPORTED' || key === 'NOT_CONFIGURED' || key === 'EMPTY') return 'neutral'
  return 'neutral'
}

/** Partner KYC status (compliance, clients directory). */
export function toneForKycStatus(status: string): AdminBadgeTone {
  const key = keyOf(status)
  if (key === 'APPROVED' || key === 'VERIFIED') return 'ok'
  if (key === 'REJECTED' || key === 'DENIED' || key === 'HIGH_RISK') return 'bad'
  if (
    key === 'PENDING' ||
    key === 'EN_ATTENTE' ||
    key === 'IN_REVIEW' ||
    key === 'IN_PROGRESS' ||
    key === 'REQUIRED' ||
    key === 'EXPIRED'
  ) {
    return 'warn'
  }
  return 'neutral'
}

/** Backend reading state (Live / Offline / Issue). */
export function toneForBackendState(etat: 'LIVE' | 'OFFLINE' | 'ISSUE'): AdminBadgeTone {
  if (etat === 'LIVE') return 'ok'
  if (etat === 'ISSUE') return 'warn'
  return 'neutral'
}
