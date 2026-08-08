import { HearstCriticalAction, HearstDangerAction, HearstIconAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import { Badge } from '@/components/catalyst/badge'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { PriorityQueueRow } from '@/components/compositions'
import {
  BanknotesIcon,
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  WalletIcon,
} from '@heroicons/react/16/solid'
import { CheckCircleIcon, InboxIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'

/**
 * « À traiter » — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Reconstruit d'après Application UI v4 : chips résumé (`feedback/alerts/05`),
 * panneau d'action principal en « well » (`forms/action-panels/08`), flux
 * compact (`lists/feeds/01`) et empty-state honnête (`feedback/empty-states/01`).
 * Le brief §4 l'exige : la zone ne doit plus être une grande carte vide.
 *
 * Tout vient de `buildPriorityQueue` (`Availability<readonly PriorityItem[]>`,
 * déjà triée par sévérité). Les compteurs des chips sont mesurés sur les vraies
 * lignes ; aucun montant n'est fabriqué (les `PriorityItem` ne portent pas de
 * montant — un chip monétaire attend un endpoint dédié). File vide → empty
 * honnête ; source absente → indisponibilité nommée, jamais un « 0 à traiter ».
 */

const KIND_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  kyc: ClipboardDocumentCheckIcon,
  wallet: WalletIcon,
  depot: BanknotesIcon,
  souscription: BanknotesIcon,
  transaction: ExclamationTriangleIcon,
}

const KIND_PROBLEM: Record<string, string> = {
  kyc: 'KYC pending',
  wallet: 'Wallet to create',
  depot: 'Deposit to reconcile',
  souscription: 'Signature required',
  transaction: 'Failed transaction',
}

const KIND_LABEL: Record<string, string> = {
  kyc: 'KYC',
  wallet: 'Wallet',
  depot: 'Deposit',
  souscription: 'Subscription',
  transaction: 'Transaction',
}

const SEVERITY_BADGE: Record<PriorityQueueRow['severity'], { color: 'red' | 'amber' | 'neutral'; label: string }> = {
  critique: { color: 'red', label: 'Critical' },
  important: { color: 'amber', label: 'Important' },
  information: { color: 'neutral', label: 'Information' },
}

function Chip({ tone, count, label }: Readonly<{ tone: 'danger' | 'warning' | 'accent'; count: number; label: string }>) {
  const cls =
    tone === 'danger'
      ? 'border-danger-500 bg-danger-400/10 text-danger-700 dark:text-danger-300'
      : tone === 'warning'
        ? 'border-warning-500 bg-warning-400/10 text-warning-700 dark:text-warning-400'
        : 'border-accent-500 bg-accent-400/10 text-accent-700 dark:text-accent-300'
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-md border-l-4 px-2.5 py-1 text-xs font-medium', cls)}>
      <span className="tabular-nums font-semibold">{count}</span>
      {label}
    </span>
  )
}

function EmptyState({ tone, title, subline }: Readonly<{ tone: 'calm' | 'unavailable'; title: string; subline: string }>) {
  const Icon = tone === 'calm' ? CheckCircleIcon : InboxIcon
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
      <Icon
        className={clsx('size-8', tone === 'calm' ? 'text-accent-500 dark:text-accent-400' : 'text-fg dark:text-console-fill')}
        aria-hidden="true"
      />
      <p className="mt-2 text-sm font-semibold text-ink dark:text-fg">{title}</p>
      <p className="mt-0.5 text-xs text-fg-tertiary dark:text-fg-secondary">{subline}</p>
    </div>
  )
}

export function ActionQueue({
  rows,
  maxRows = 6,
}: Readonly<{ rows: Availability<readonly PriorityQueueRow[]>; maxRows?: number }>) {
  // Le `data-widget` enveloppe TOUS les états — la zone reste identifiable même
  // vide ou indisponible (aucun état muet).
  return (
    <div data-widget="action-queue" className="flex flex-col gap-4">
      <ActionQueueBody rows={rows} maxRows={maxRows} />
    </div>
  )
}

function ActionQueueBody({
  rows,
  maxRows,
}: Readonly<{ rows: Availability<readonly PriorityQueueRow[]>; maxRows: number }>) {
  if (!isAvailable(rows)) {
    return (
      <EmptyState
        tone="unavailable"
        title="Data unavailable"
        subline="The priority queue could not be read."
      />
    )
  }
  if (rows.value.length === 0) {
    return (
      <EmptyState
        tone="calm"
        title="Nothing to process"
        subline="The subscription queue is up to date."
      />
    )
  }

  const critique = rows.value.filter((r) => r.severity === 'critique').length
  const important = rows.value.filter((r) => r.severity === 'important').length
  const total = rows.value.length

  const [primary, ...rest] = rows.value
  const restVisible = rest.slice(0, Math.max(0, maxRows - 1))
  const remaining = rest.length - restVisible.length

  const primaryBadge = SEVERITY_BADGE[primary.severity]
  const primaryProblem = KIND_PROBLEM[primary.kind] ?? primary.kind
  const primaryIsIncident = primary.kind === 'transaction' || primary.severity === 'critique'

  return (
    <>
      {/* A. Résumé — compteurs mesurés sur les vraies lignes */}
      <div className="flex flex-wrap gap-2">
        {critique > 0 ? <Chip tone="danger" count={critique} label="critical" /> : null}
        {important > 0 ? <Chip tone="warning" count={important} label="important" /> : null}
        <Chip tone="accent" count={total} label="to process" />
      </div>

      {/* B. Action principale — panneau « well » (action-panels/08) */}
      <div className={clsx(surfaceInset, 'p-4')}>
        <div className="flex items-center justify-between gap-2">
          <Badge color={primaryBadge.color}>{primaryBadge.label}</Badge>
          <span className="text-xs uppercase tracking-wide text-fg-tertiary dark:text-fg-secondary">
            {KIND_LABEL[primary.kind] ?? primary.kind}
          </span>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-ink dark:text-fg">{primary.clientLabel}</p>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <div className="min-w-0">
            <dt className="text-fg-tertiary dark:text-fg-secondary">Issue</dt>
            <dd className="truncate font-medium text-console-raised dark:text-fg-secondary">{primaryProblem}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-fg-tertiary dark:text-fg-secondary">Age</dt>
            <dd className="truncate font-medium text-console-raised dark:text-fg-secondary">{primary.ageLabel}</dd>
          </div>
        </dl>
        <div className="mt-3">
          {primaryIsIncident ? (
            <HearstDangerAction href={primary.actionHref} className="w-full justify-center">
              {primary.actionLabel}
            </HearstDangerAction>
          ) : (
            <HearstCriticalAction href={primary.actionHref} className="w-full justify-center">
              {primary.actionLabel}
            </HearstCriticalAction>
          )}
        </div>
      </div>

      {/* C. Flux secondaire compact (feeds/01) */}
      {restVisible.length > 0 ? (
        <ul className="space-y-3">
          {restVisible.map((row) => {
            const Icon = KIND_ICON[row.kind] ?? ExclamationTriangleIcon
            const problem = KIND_PROBLEM[row.kind] ?? row.kind
            return (
              <li key={row.id} className="flex items-center gap-3">
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-400/15 text-accent-700 dark:text-accent-400">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink dark:text-fg">{row.clientLabel}</p>
                  <p className="truncate text-xs text-fg-tertiary dark:text-fg-secondary">
                    {problem} · {row.ageLabel}
                  </p>
                </div>
                <HearstIconAction
                  href={row.actionHref}
                  icon={<ChevronRightIcon />}
                  aria-label={`Open ${row.clientLabel}`}
                />
              </li>
            )
          })}
        </ul>
      ) : null}

      {remaining > 0 ? (
        <p className="text-xs text-fg-tertiary dark:text-fg-secondary">
          +{remaining} other{remaining > 1 ? 's' : ''} in queue.
        </p>
      ) : null}
    </>
  )
}
