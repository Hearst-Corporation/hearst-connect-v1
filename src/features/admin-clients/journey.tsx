import type { ClientEntry } from '@/lib/clients/book'
import { formatDate } from '@/lib/format'

/**
 * Le parcours d'un client, de l'offre au vault en vie courante.
 *
 * Sept étapes, dans l'ordre où elles surviennent réellement. Chacune est
 * franchie, en cours, ou à venir — et la carte dit, en vert, ce qui doit se
 * passer maintenant. Un client dont le vault tourne depuis avant l'outil
 * d'offres a toutes ses étapes franchies : son parcours est derrière lui.
 */

type Step = Readonly<{ label: string; detail: string | null; done: boolean }>

const ORDER = ['prospect', 'draft', 'sent', 'accepted', 'funding', 'funded', 'active'] as const

function reached(entry: ClientEntry, stage: (typeof ORDER)[number]): boolean {
  if (entry.stage === 'active') return true
  if (entry.stage === 'closed') return false
  return ORDER.indexOf(entry.stage as (typeof ORDER)[number]) >= ORDER.indexOf(stage)
}

export function Journey({ entry }: Readonly<{ entry: ClientEntry }>) {
  const o = entry.offer
  const kycOk = ['APPROVED', 'VERIFIED'].includes((entry.kycStatus ?? '').toUpperCase())
  const date = (iso: string | null | undefined) => (iso ? formatDate(iso) : null)

  const steps: Step[] = [
    { label: 'Offer prepared', detail: date(o?.createdAt), done: reached(entry, 'draft') || (entry.stage === 'closed' && o !== null) },
    { label: 'Offer sent', detail: date(o?.sentAt), done: reached(entry, 'sent') || (entry.stage === 'closed' && o?.sentAt != null) },
    { label: 'Accepted', detail: date(o?.decidedAt), done: reached(entry, 'accepted') },
    { label: 'KYC approved', detail: 'Som', done: kycOk || entry.stage === 'active' },
    { label: 'Funds called', detail: 'Credentials + funding link', done: reached(entry, 'funding') },
    { label: 'Funds received', detail: null, done: reached(entry, 'funded') },
    {
      label: 'Vault live',
      detail: date(entry.vault?.lockupStartAt),
      done: entry.stage === 'active',
    },
  ]
  const current = steps.findIndex((s) => !s.done)

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-2 gap-x-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((s, i) => {
          const isCurrent = i === current && entry.stage !== 'closed'
          return (
            <li key={s.label} className="relative flex flex-col gap-2">
              {/* Le fil entre deux étapes : plein derrière, pointillé devant. */}
              {i < steps.length - 1 ? (
                <span
                  className={`absolute top-3.5 left-8 hidden h-px lg:block ${s.done ? 'bg-[var(--hearst-green)]' : 'border-t border-dashed border-[var(--ud-line)]'}`}
                  style={{ width: 'calc(100% - 1.5rem)' }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={`relative z-10 flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  s.done
                    ? 'bg-[var(--hearst-green)] text-[var(--hearst-green-ink)]'
                    : isCurrent
                      ? 'bg-[var(--ud-card)] text-fg ring-2 ring-[var(--hearst-green)]'
                      : 'bg-[var(--ud-inset)] text-fg-tertiary ring-1 ring-[var(--ud-line)]'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-sm ${s.done || isCurrent ? 'font-medium text-fg' : 'text-fg-tertiary'}`}>{s.label}</p>
                {s.detail ? <p className="text-xs text-fg-tertiary">{s.detail}</p> : null}
              </div>
            </li>
          )
        })}
      </ol>

      {entry.stage === 'closed' ? (
        <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-3 text-sm text-fg-secondary">
          The offer was {entry.closedReason === 'expired' ? 'left to expire' : 'declined'}
          {o?.decidedAt ? ` on ${formatDate(o.decidedAt)}` : ''}. A new offer reopens the journey.
        </p>
      ) : entry.nextAction !== null ? (
        <div
          className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
            entry.onUs ? 'bg-[var(--hearst-green-dim)] text-fg' : 'bg-[var(--ud-inset)] text-fg-secondary'
          }`}
        >
          <span
            className={`size-2 shrink-0 rounded-full ${entry.onUs ? 'bg-[var(--hearst-green)]' : 'bg-[var(--ud-fg-3)]'}`}
            aria-hidden="true"
          />
          <span>
            <span className="font-medium">{entry.onUs ? 'Next, on us: ' : 'Waiting: '}</span>
            {entry.nextAction}
          </span>
        </div>
      ) : (
        <p className="text-sm text-fg-tertiary">Nothing is waiting — the vault runs on its own.</p>
      )}
    </div>
  )
}
