import { gcc } from '@/components/layout/console'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { SourceAttendue, CalmState } from '@/components/compositions/empty-state'
import { Panel } from '@/components/compositions/panel'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

/**
 * "À traiter maintenant" — the ranked work queue. Every row names its own
 * resolution (an exception without an action is a complaint, not a work
 * item — the doctrine already stated for `ClientException`).
 */

export type PriorityQueueRow = Readonly<{
  id: string
  kind: string
  clientLabel: string
  status: string
  ageLabel: string
  severity: 'critique' | 'important' | 'information'
  actionHref: string
  actionLabel: string
}>

const SEVERITY_BADGE: Record<PriorityQueueRow['severity'], { color: 'red' | 'amber' | 'zinc'; label: string }> = {
  critique: { color: 'red', label: 'Critique' },
  important: { color: 'amber', label: 'Important' },
  information: { color: 'zinc', label: 'Information' },
}

const KIND_LABEL: Record<string, string> = {
  kyc: 'KYC',
  wallet: 'Wallet',
  depot: 'Dépôt',
  souscription: 'Souscription',
  transaction: 'Transaction',
}

export function PriorityQueue({
  rows,
  source,
  maxRows = 8,
  seeAllHref,
  className,
}: Readonly<{
  rows: Availability<readonly PriorityQueueRow[]>
  source: React.ComponentProps<typeof SourceAttendue>
  maxRows?: number
  seeAllHref?: string
  className?: string
}>) {
  if (!isAvailable(rows)) {
    return <SourceAttendue {...source} />
  }

  if (rows.value.length === 0) {
    return <CalmState message="Aucune action prioritaire — la file est à jour." />
  }

  const visible = rows.value.slice(0, maxRows)
  const remaining = rows.value.length - visible.length

  return (
    <Panel tone="wave" className={className} data-widget="priority-queue">
      <ul className="divide-y divide-console-line-soft">
        {visible.map((row) => {
          const badge = SEVERITY_BADGE[row.severity]
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={badge.color}>{badge.label}</Badge>
                  <span className={clsx(gcc.cellText, 'text-xs uppercase tracking-wide text-zinc-500')}>
                    {KIND_LABEL[row.kind] ?? row.kind}
                  </span>
                </div>
                <p className={clsx(gcc.cardTitle, 'mt-1 text-sm')}>{row.clientLabel}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {row.status} · {row.ageLabel}
                </p>
              </div>
              <Link
                href={row.actionHref}
                className="shrink-0 rounded-md bg-zinc-950/5 px-3 py-1.5 text-xs font-medium underline-offset-2 hover:underline dark:bg-white/10"
              >
                {row.actionLabel}
              </Link>
            </li>
          )
        })}
      </ul>
      {remaining > 0 && seeAllHref !== undefined ? (
        <p className="border-t border-console-line-soft px-5 py-3 text-xs">
          <Link href={seeAllHref} className="underline underline-offset-2">
            Voir les {remaining} élément(s) restant(s)
          </Link>
        </p>
      ) : null}
    </Panel>
  )
}
