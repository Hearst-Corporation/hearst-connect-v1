'use client'

import { formatDateTime } from '@/lib/format'
import type { Section, SettingsChange, TeamMember } from '@/lib/settings/schema'
import { useState, useTransition } from 'react'
import { decideChange } from './actions'
import { diffOf } from './format'

/**
 * UNE DEMANDE DE CHANGEMENT — ce qu'elle modifie, qui l'a demandée, qui l'a
 * approuvée, et quand elle s'applique.
 *
 * L'approbateur lit le diff champ par champ avant de signer. L'auteur ne peut
 * ni approuver ni refuser (quatre yeux) : la démo n'ayant qu'une session, on
 * choisit le membre qui décide, et le backend vérifie son rôle.
 */

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Waiting for approval', tone: 'text-amber-300 ring-amber-300/30' },
  scheduled: { label: 'Approved · timelock running', tone: 'text-sky-300 ring-sky-300/30' },
  applied: { label: 'Applied', tone: 'text-[var(--hearst-green)] ring-[var(--hearst-green)]/30' },
  rejected: { label: 'Rejected', tone: 'text-red-400 ring-red-400/30' },
  cancelled: { label: 'Cancelled', tone: 'text-fg-tertiary ring-[var(--ud-line)]' },
}

export function ChangeCard({
  change,
  section,
  team,
  approverRoles,
  me,
  compact = false,
}: Readonly<{
  change: SettingsChange
  section: Section
  team: readonly TeamMember[]
  approverRoles: readonly string[]
  me: string
  compact?: boolean
}>) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nameOf = (email: string) => team.find((m) => m.email === email)?.name ?? email
  const eligible = team.filter(
    (m) =>
      m.status === 'active' &&
      approverRoles.includes(m.role) &&
      m.email !== change.author &&
      !change.approvals.some((a) => a.by === m.email),
  )
  const [approver, setApprover] = useState(eligible[0]?.email ?? '')
  const status = STATUS[change.status] ?? STATUS.pending
  const lines = diffOf(section, change.before, change.after)

  const decide = (decision: 'approve' | 'reject' | 'cancel') => {
    setError(null)
    start(async () => {
      const out = await decideChange(change.id, decision, decision === 'cancel' ? me : approver)
      if (!out.ok) setError(out.error)
    })
  }

  return (
    <article className="flex flex-col gap-4 rounded-[var(--ud-radius-sm)] p-4 ring-1 ring-[var(--ud-line)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium text-fg">
            {compact ? `${section.title} · ` : ''}
            {lines.length} change{lines.length === 1 ? '' : 's'} requested by {nameOf(change.author)}
          </p>
          <p className="text-xs text-fg-tertiary">
            {formatDateTime(change.createdAt)}
            {change.reason ? ` · “${change.reason}”` : ''}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${status.tone}`}>{status.label}</span>
      </header>

      {/* Le diff, champ par champ : avant → après. */}
      <ul className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <li key={i} className="rounded-[var(--ud-radius-sm)] bg-white/[0.03] px-3 py-2 text-xs">
            <p className="mb-1 font-medium text-fg">
              <span
                className={
                  line.kind === 'added' ? 'text-[var(--hearst-green)]' : line.kind === 'removed' ? 'text-red-400' : 'text-amber-300'
                }
              >
                {line.kind === 'added' ? 'Added' : line.kind === 'removed' ? 'Removed' : 'Changed'}
              </span>{' '}
              · {line.label}
            </p>
            {line.fields.length > 0 ? (
              <dl className="grid grid-cols-[minmax(0,10rem)_1fr] gap-x-3 gap-y-0.5">
                {line.fields.map((f) => (
                  <div key={f.label} className="contents">
                    <dt className="text-fg-tertiary">{f.label}</dt>
                    <dd className="min-w-0 break-words text-fg-secondary">
                      {line.kind === 'changed' ? (
                        <>
                          <span className="line-through opacity-60">{f.before}</span> → <span className="text-fg">{f.after}</span>
                        </>
                      ) : (
                        f.after
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="text-fg-tertiary">
          Approvals {change.approvals.length}/{change.required}
          {change.approvals.length > 0 ? ` · ${change.approvals.map((a) => nameOf(a.by)).join(', ')}` : ''}
        </span>
        {change.status === 'scheduled' && change.effectiveAt ? (
          <span className="text-sky-300">Takes effect {formatDateTime(change.effectiveAt)}</span>
        ) : null}
        {change.status === 'pending' && section.timelockHours > 0 ? (
          <span className="text-fg-tertiary">then {section.timelockHours} h timelock</span>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {change.status === 'pending' ? (
            eligible.length > 0 ? (
              <>
                <label className="flex items-center gap-2 text-fg-tertiary">
                  Decide as
                  <select
                    value={approver}
                    onChange={(e) => setApprover(e.target.value)}
                    className="h-8 rounded-full bg-[var(--ud-inset)] px-3 text-xs text-fg ring-1 ring-[var(--ud-line)] outline-none"
                  >
                    {eligible.map((m) => (
                      <option key={m.email} value={m.email}>
                        {m.name} · {m.role}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => decide('reject')}
                  className="inline-flex h-8 items-center rounded-full px-3.5 font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5 disabled:opacity-50"
                >
                  Reject
                </button>
                <button type="button" disabled={pending} onClick={() => decide('approve')} className="ud-cta inline-flex h-8 items-center disabled:opacity-50">
                  {pending ? '…' : 'Approve'}
                </button>
              </>
            ) : (
              <span className="text-amber-300">No other member can approve — allowed roles: {approverRoles.join(', ')}</span>
            )
          ) : null}
          {(change.status === 'pending' && change.author === me) || change.status === 'scheduled' ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => decide('cancel')}
              className="inline-flex h-8 items-center rounded-full px-3.5 font-medium text-fg-secondary hover:text-fg disabled:opacity-50"
            >
              Cancel request
            </button>
          ) : null}
        </div>
      </footer>
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
    </article>
  )
}
