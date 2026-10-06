import Link from 'next/link'
import { approvalAmount } from '@/lib/admin-dashboard/amounts'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import { DecisionButtons } from './decision-buttons'
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
    hint: 'Client-initiated. Processing releases bitcoin out of the reserve.',
    icon: ArrowUpTrayIcon,
    action: 'Process',
  },
  rebalance: {
    label: 'Rebalances to approve',
    hint: 'A vault has left its band. Approving lets the keeper move capital back to its target.',
    icon: ArrowPathIcon,
    action: 'Approve',
  },
  protocol: {
    label: 'Protocol changes',
    hint: 'Moving a bucket to another protocol changes where the client’s capital works — it needs a sign-off.',
    icon: ArrowsRightLeftIcon,
    action: 'Approve',
  },
}

/** La section de la fiche client où chaque décision a son contexte. */
const SECTION_OF: Record<AdminApprovalKind, string> = {
  distribution: '#rewards',
  rebalance: '#allocation',
  protocol: '#allocation',
  deposit: '#decisions',
  withdrawal: '#decisions',
}

/** Ordre FIXE : l'opérateur retrouve les mêmes groupes à la même place. */
const KIND_ORDER: readonly AdminApprovalKind[] = ['withdrawal', 'rebalance', 'protocol', 'distribution', 'deposit']

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
          <section key={kind} id={kind} aria-label={meta.label} className="flex scroll-mt-24 flex-col gap-3">
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
                  {/* Sur téléphone le texte prend la ligne ; montant, date et
                      boutons passent dessous, les boutons calés à droite. */}
                  <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                    {/* Le nom mène à la fiche du client, à la section de cette décision. */}
                    <Link
                      href={`/admin/clients/${item.clientId}${SECTION_OF[item.kind]}`}
                      className="truncate text-sm font-medium text-fg hover:underline"
                    >
                      {item.clientLabel}
                    </Link>
                    <p className="truncate text-xs text-fg-tertiary">
                      {item.note ?? item.vaultId}
                    </p>
                    {item.rebalance ? (
                      <p className="mt-0.5 text-xs text-fg-secondary">
                        Move {item.rebalance.fromBucket} → {item.rebalance.toBucket} · drift M{' '}
                        {formatNumber(item.rebalance.driftBps.mining / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} · L{' '}
                        {formatNumber(item.rebalance.driftBps.lending / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} · U{' '}
                        {formatNumber(item.rebalance.driftBps.stable / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt
                      </p>
                    ) : null}
                    {item.protocol ? (
                      <p className="mt-0.5 text-xs text-fg-secondary">
                        {item.protocol.bucket}: {item.protocol.fromProtocol} {formatNumber(item.protocol.fromApyPct, { maximumFractionDigits: 1 })} % →{' '}
                        <span className="text-[var(--hearst-green)]">
                          {item.protocol.toProtocol} {formatNumber(item.protocol.toApyPct, { maximumFractionDigits: 1 })} %
                        </span>{' '}
                        · {item.protocol.reason}
                      </p>
                    ) : null}
                  </div>

                  <p className="shrink-0 text-sm font-semibold tabular-nums text-fg">
                    {approvalAmount(item)}
                  </p>

                  <p className="shrink-0 text-xs tabular-nums text-fg-tertiary">
                    {item.requestedAt !== null ? formatDate(item.requestedAt) : '—'}
                  </p>

                  <span className="ml-auto sm:ml-0">
                    <DecisionButtons id={item.id} action={meta.action} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
