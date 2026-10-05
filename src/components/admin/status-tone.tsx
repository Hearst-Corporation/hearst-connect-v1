import { StatusMark } from '@hearst/ui/status'
import clsx from 'clsx'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

/** An item's state written in its colour, without a fill. */

export type AdminBadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent'

export const ADMIN_TONE_CLASS: Record<AdminBadgeTone, string> = {
  ok: 'text-(--ds-success)',
  warn: 'text-(--ds-warning)',
  bad: 'text-(--ds-danger)',
  info: 'text-(--ds-text)',
  neutral: 'text-(--ds-text-subtle)',
  accent: 'text-(--ds-accent)',
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
      className={clsx('inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap', ADMIN_TONE_CLASS[tone], className)}
      {...rest}
    >
      {showDot ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

const MARK_TONE = {
  ok: 'active',
  accent: 'active',
  warn: 'pending',
  info: 'pending',
  neutral: 'pending',
  bad: 'inactive',
} as const satisfies Record<AdminBadgeTone, string>

/** A row's state as the round mark, its word on hover; `children` stays written beside (a date). */
export function ToneMark({ tone, label, children }: Readonly<{ tone: AdminBadgeTone; label: string; children?: ReactNode }>) {
  return (
    <StatusMark tone={MARK_TONE[tone]} label={label}>
      {children}
    </StatusMark>
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
