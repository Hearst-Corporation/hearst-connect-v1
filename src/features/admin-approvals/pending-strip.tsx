import Link from 'next/link'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, BanknotesIcon, ClockIcon } from '@heroicons/react/24/outline'
import { formatNumber } from '@/lib/format'
import { isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import type { AdminApproval, AdminApprovalKind } from '@/lib/admin-dashboard/contracts'
import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'

/**
 * Bandeau des décisions en attente, en tête du tableau de bord.
 *
 * Il ne détaille rien : il DIT qu'il y a des clients qui attendent, et combien.
 * Le détail vit sur la page Decisions, vers laquelle chaque compteur mène.
 *
 * Un tableau de bord qui n'annonce pas ce qui bloque laisse l'opérateur
 * découvrir les demandes par hasard — ou pas du tout.
 */

const usd = (v: number) => `$${formatNumber(v, { maximumFractionDigits: 0 })}`

/** Un terme à moins de trois mois demande une action commerciale. */
const DUE_SOON_MONTHS = 3

export function PendingStrip({
  approvals,
  vaults,
}: Readonly<{
  approvals: Availability<readonly AdminApproval[]>
  vaults: Availability<readonly AdminVaultRecord[]>
}>) {
  const rows = valueOf(approvals)
  const registry = valueOf(vaults)

  if (rows === null) {
    return (
      <p className="text-sm text-fg-tertiary">
        {isAvailable(approvals)
          ? 'Nothing is waiting on a decision.'
          : 'The approvals queue could not be read — nothing is shown rather than a guess.'}
      </p>
    )
  }

  const sumOf = (kind: AdminApprovalKind) =>
    rows.filter((r) => r.kind === kind).reduce((sum, r) => sum + (r.amountUsdc ?? 0), 0)

  const countOf = (kind: AdminApprovalKind) => rows.filter((r) => r.kind === kind).length

  const dueSoon =
    registry === null
      ? null
      : registry.filter(
          (v) =>
            v.lockupMonths !== null &&
            v.lockupElapsedMonths !== null &&
            v.lockupMonths - v.lockupElapsedMonths <= DUE_SOON_MONTHS,
        ).length

  const cells = [
    {
      id: 'withdrawal',
      label: 'Withdrawals to process',
      count: countOf('withdrawal'),
      amount: sumOf('withdrawal'),
      icon: ArrowUpTrayIcon,
    },
    {
      id: 'distribution',
      label: 'Distributions to sign off',
      count: countOf('distribution'),
      amount: sumOf('distribution'),
      icon: BanknotesIcon,
    },
    {
      id: 'deposit',
      label: 'Deposits to authorise',
      count: countOf('deposit'),
      amount: sumOf('deposit'),
      icon: ArrowDownTrayIcon,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div /* Les tokens de /account : le fond de grille EST le filet, et les
              cellules reposent dessus. `console-line-soft` est un blanc à 5 %,
              qui éclaircissait la carte au lieu de dessiner un trait. */
          className="grid gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] sm:grid-cols-2 lg:grid-cols-4">
        {cells.map((cell) => {
          const Icon = cell.icon
          return (
            <Link
              key={cell.id}
              href="/admin/approvals"
              className="flex flex-col gap-1.5 bg-[var(--ud-card)] px-4 py-3.5 transition-colors hover:bg-[var(--ud-card-raised)]"
            >
              <span className="flex items-center gap-2 text-xs text-fg-tertiary">
                <Icon className="size-4 text-accent-400" aria-hidden="true" />
                {cell.label}
              </span>
              <span className="text-2xl font-semibold tabular-nums text-fg">{cell.count}</span>
              {/* Le montant qualifie l'attente : trois demandes à 5 000 $ ne
                  pèsent pas comme une seule à 1,5 M$. */}
              <span className="text-xs tabular-nums text-fg-tertiary">
                {cell.count > 0 ? usd(cell.amount) : 'nothing pending'}
              </span>
            </Link>
          )
        })}

        <Link
          href="/admin/approvals"
          className="flex flex-col gap-1.5 bg-[var(--ud-card)] px-4 py-3.5 transition-colors hover:bg-[var(--ud-card-raised)]"
        >
          <span className="flex items-center gap-2 text-xs text-fg-tertiary">
            <ClockIcon className="size-4 text-accent-400" aria-hidden="true" />
            Lockups ending soon
          </span>
          <span className="text-2xl font-semibold tabular-nums text-fg">
            {dueSoon === null ? '—' : dueSoon}
          </span>
          <span className="text-xs text-fg-tertiary">
            {dueSoon === null ? 'registry unread' : `within ${DUE_SOON_MONTHS} months`}
          </span>
        </Link>
      </div>
    </div>
  )
}
