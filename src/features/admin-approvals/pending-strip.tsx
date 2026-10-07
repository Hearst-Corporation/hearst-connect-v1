import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
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

  /* Un dépôt se compte en USDC (le versement d'entrée) ; une distribution ou un
     retrait, en bitcoin — c'est ce qui sort de la réserve. */
  const sumOf = (kind: AdminApprovalKind) =>
    kind === 'deposit'
      ? `${usd(rows.filter((r) => r.kind === kind).reduce((sum, r) => sum + (r.amountUsdc ?? 0), 0))} USDC`
      : btcFromSats(rows.filter((r) => r.kind === kind).reduce((sum, r) => sum + (r.amountBtcSats ?? 0), 0))

  const countOf = (kind: AdminApprovalKind) => rows.filter((r) => r.kind === kind).length

  /** Où mène « Details » : la fiche quand il n'y a qu'un client, sinon son groupe dans la file, juste dessous. */
  const detailsHref = (kind: AdminApprovalKind) => {
    const items = rows.filter((r) => r.kind === kind)
    const clients = new Set(items.map((r) => r.clientId))
    if (items.length > 0 && clients.size === 1) return `/admin/clients/${items[0].clientId}${SECTION_OF[kind]}`
    return `/admin#${kind}`
  }

  const ending =
    registry === null
      ? null
      : registry.filter(
          (v) =>
            v.lockupMonths !== null &&
            v.lockupElapsedMonths !== null &&
            v.lockupMonths - v.lockupElapsedMonths <= DUE_SOON_MONTHS,
        )
  const dueSoon = ending === null ? null : ending.length
  // Un seul lockup qui arrive à terme : sa fiche ; plusieurs : la liste des vaults actifs.
  const lockupHref =
    ending !== null && ending.length === 1 ? `/admin/clients/${ending[0].clientId}` : '/admin/clients?view=active'

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
    {
      id: 'rebalance',
      label: 'Rebalances to approve',
      count: countOf('rebalance'),
      amount: `${countOf('rebalance')} vault${countOf('rebalance') === 1 ? '' : 's'} out of band`,
      icon: ArrowPathIcon,
    },
    {
      id: 'protocol',
      label: 'Protocol changes',
      count: countOf('protocol'),
      amount: 'to sign off',
      icon: ArrowsRightLeftIcon,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div /* Les tokens de /account : le fond de grille EST le filet, et les
              cellules reposent dessus. `console-line-soft` est un blanc à 5 %,
              qui éclaircissait la carte au lieu de dessiner un trait. */
          className="grid gap-px overflow-hidden rounded-[var(--ud-radius-sm)] bg-[var(--ud-line)] sm:grid-cols-2 lg:grid-cols-3">
        {cells.map((cell) => {
          const Icon = cell.icon
          /* Toute la tuile s'ouvre : une demande → sa fiche, plusieurs → leur
             groupe dans la file juste dessous (toutes, avec leurs boutons). */
          return (
            <Tile key={cell.id} href={cell.count > 0 ? detailsHref(cell.id as AdminApprovalKind) : null} count={cell.count}>
              <span className="flex items-center gap-2 text-xs text-fg-tertiary">
                <Icon className="size-4 text-accent-400" aria-hidden="true" />
                <span className="min-w-0 truncate">{cell.label}</span>
              </span>
              <span className="text-2xl font-semibold tabular-nums text-fg">{cell.count}</span>
              {/* Le montant qualifie l'attente : trois demandes à 5 000 $ ne
                  pèsent pas comme une seule à 1,5 M$. */}
              <span className="text-xs tabular-nums text-fg-tertiary">{cell.count > 0 ? cell.amount : 'nothing pending'}</span>
            </Tile>
          )
        })}

        <Tile href={dueSoon ? lockupHref : null} count={dueSoon ?? 0}>
          <span className="flex items-center gap-2 text-xs text-fg-tertiary">
            <ClockIcon className="size-4 text-accent-400" aria-hidden="true" />
            <span className="min-w-0 truncate">Lockups ending soon</span>
          </span>
          <span className="text-2xl font-semibold tabular-nums text-fg">
            {dueSoon === null ? '—' : dueSoon}
          </span>
          <span className="text-xs text-fg-tertiary">
            {dueSoon === null ? 'registry unread' : `within ${DUE_SOON_MONTHS} months`}
          </span>
        </Tile>
      </div>
    </div>
  )
}

const CELL = 'flex flex-col gap-1.5 bg-[var(--ud-card)] px-4 py-3.5'

/** La section de la fiche client où se prend chaque décision. */
const SECTION_OF: Record<AdminApprovalKind, string> = {
  distribution: '#rewards',
  rebalance: '#allocation',
  protocol: '#allocation',
  deposit: '#decisions',
  withdrawal: '#decisions',
}

/**
 * Une tuile du résumé. Avec quelque chose dedans, TOUTE la tuile s'ouvre :
 * survol, curseur, et au survol ce qu'elle ouvre (« Review 7 », « Open »).
 * Vide, elle se lit sans inviter au clic.
 */
function Tile({ href, count, children }: Readonly<{ href: string | null; count: number; children: React.ReactNode }>) {
  if (href === null) return <div className={CELL}>{children}</div>
  return (
    <Link href={href} className={`${CELL} group relative no-underline transition-colors hover:bg-white/[0.035]`}>
      {children}
      <span className="pointer-events-none absolute right-4 bottom-3.5 text-xs text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100">
        {count > 1 ? `Review ${count}` : 'Open'} →
      </span>
    </Link>
  )
}
