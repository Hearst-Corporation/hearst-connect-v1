import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'
import { formatDate, formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { AdminApproval, AdminApprovalKind } from '@/lib/admin-dashboard/contracts'

/**
 * File des décisions en attente d'un opérateur.
 *
 * Contrepartie de tout ce que l'écran client laisse en suspens : le bouton
 * « Increase vault » y est grisé jusqu'à cet accord, une distribution y est
 * annoncée jusqu'à cette signature, un retrait y est demandé jusqu'à ce
 * traitement.
 *
 * Les trois genres sont SÉPARÉS, jamais fondus dans une file unique. Chacun
 * engage autre chose — un dépôt engage KYC, capacité et contrat ; une
 * distribution déclenche un paiement ; un retrait libère des fonds. Les mêler
 * obligerait l'opérateur à relire le type avant chaque geste.
 *
 * Les boutons n'appellent rien : aucun endpoint de décision n'existe côté
 * backend. Ils sont désactivés et le disent — un bouton actif qui échouerait
 * vaut moins qu'un bouton inerte qui explique pourquoi.
 */

type KindMeta = {
  readonly label: string
  readonly hint: string
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>
  readonly action: string
}

const KINDS: Record<AdminApprovalKind, KindMeta> = {
  deposit: {
    label: 'Deposit authorisations',
    hint: 'Growing a vault engages KYC, capacity and contract — the client cannot self-serve.',
    icon: ArrowDownTrayIcon,
    action: 'Authorise',
  },
  distribution: {
    label: 'Distributions to sign off',
    hint: 'Announced to the client, not yet paid. Signing releases the payment.',
    icon: BanknotesIcon,
    action: 'Approve',
  },
  withdrawal: {
    label: 'Withdrawal requests',
    hint: 'Client-initiated. Processing releases funds out of the vault.',
    icon: ArrowUpTrayIcon,
    action: 'Process',
  },
}

/** Ordre FIXE : l'opérateur retrouve les mêmes groupes à la même place. */
const KIND_ORDER: readonly AdminApprovalKind[] = ['withdrawal', 'distribution', 'deposit']

const usd = (v: number | null) =>
  v === null ? '—' : `$${formatNumber(v, { maximumFractionDigits: 0 })}`

export function ApprovalsQueue({
  approvals,
}: Readonly<{ approvals: Availability<readonly AdminApproval[]> }>) {
  const rows = valueOf(approvals)

  if (rows === null) {
    return (
      <p className="text-sm text-fg-tertiary">
        {isAvailable(approvals)
          ? 'Nothing is waiting on a decision.'
          : 'The approvals queue could not be read — nothing is shown rather than a guess.'}
      </p>
    )
  }

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    meta: KINDS[kind],
    items: rows.filter((r) => r.kind === kind),
  })).filter((g) => g.items.length > 0)

  if (groups.length === 0) {
    return <p className="text-sm text-fg-tertiary">Nothing is waiting on a decision.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ kind, meta, items }) => {
        const Icon = meta.icon
        return (
          <section key={kind} aria-label={meta.label} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Icon className="size-4 text-accent-400" aria-hidden="true" />
                {meta.label}
                <span className="rounded-full bg-console-inset px-2 py-0.5 text-[11px] font-medium text-fg-secondary ring-1 ring-console-line-soft">
                  {items.length}
                </span>
              </h3>
              <p className="text-xs text-fg-tertiary">{meta.hint}</p>
            </div>

            <ul className="flex flex-col divide-y divide-console-line-soft rounded-lg ring-1 ring-console-line-soft">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{item.clientLabel}</p>
                    <p className="truncate text-xs text-fg-tertiary">
                      {item.note ?? item.vaultId}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                    {usd(item.amountUsdc)}
                  </p>

                  <p className="shrink-0 text-xs tabular-nums text-fg-tertiary">
                    {item.requestedAt !== null ? formatDate(item.requestedAt) : '—'}
                  </p>

                  {/* Désactivés : aucun endpoint de décision n'existe. Le titre
                      dit pourquoi, plutôt que de laisser un bouton inerte. */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled
                      title="No decision endpoint is exposed by the backend yet"
                      className="h-7 cursor-not-allowed rounded-full bg-console-inset px-3.5 text-xs font-semibold text-fg-tertiary ring-1 ring-console-line-soft"
                    >
                      {meta.action}
                    </button>
                    <button
                      type="button"
                      disabled
                      title="No decision endpoint is exposed by the backend yet"
                      className="h-7 cursor-not-allowed rounded-full px-3.5 text-xs font-medium text-fg-tertiary ring-1 ring-console-line-soft"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
