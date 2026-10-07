import { DashCard, DashboardHeader } from '@/components/admin/dashboard'
import { Callout } from '@/components/compositions'
import { CsvButton } from '@/features/client-portal/csv-button'
import { loadActivity } from '@/features/client-portal/load'
import { ActivityRow } from '@/features/client-portal/parts'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'reward', label: 'Rewards' },
  { id: 'withdrawal', label: 'Withdrawals' },
  { id: 'deposit', label: 'Deposits' },
] as const

/**
 * ACTIVITY — un seul registre, le plus récent en tête : chaque dépôt, chaque
 * reward, chaque retrait (avec ses étapes : approuvé, co-signé, confirmé) et
 * chaque réserve rendue. Filtré par type, exportable pour la comptabilité.
 */
export default async function ActivityPage({ searchParams }: Readonly<{ searchParams: Promise<{ type?: string }> }>) {
  await requireSession()
  const { type = 'all' } = await searchParams
  const activity = await loadActivity()

  return (
    <>
      <DashboardHeader title="Activity" description="Every movement of your reserve — in bitcoin, with its status." kpis={[]} />
      {activity === null ? (
        <Callout tone="warning" title="Your activity could not be read">
          Nothing is shown rather than a guess.
        </Callout>
      ) : (
        (() => {
          const shown = activity.filter((a) => type === 'all' || a.type === type || (type === 'withdrawal' && a.type === 'release'))
          return (
            <DashCard
              title="Ledger"
              subtitle={`${shown.length} movement${shown.length === 1 ? '' : 's'}, newest first`}
              action={
                <CsvButton
                  filename="hearst-activity.csv"
                  rows={[
                    ['date', 'type', 'vault', 'btc', 'usd', 'status', 'tx'],
                    ...shown.map((a) => [a.at, a.type, a.vault, a.btc, Math.round(a.usd), a.status, a.txHash]),
                  ]}
                />
              }
            >
              <div className="flex flex-col gap-5">
                <nav aria-label="Filter" className="ud-seg self-start">
                  {FILTERS.map((f) => (
                    <Link key={f.id} href={f.id === 'all' ? '/account/activity' : `/account/activity?type=${f.id}`} className={`ud-seg-btn no-underline${type === f.id ? ' active' : ''}`}>
                      {f.label}
                    </Link>
                  ))}
                </nav>
                {shown.length === 0 ? (
                  <p className="text-sm text-fg-tertiary">Nothing of this kind yet.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
                    {shown.map((a) => (
                      <ActivityRow key={a.id} item={a} withSteps={a.type === 'withdrawal'} />
                    ))}
                  </ul>
                )}
              </div>
            </DashCard>
          )
        })()
      )}
    </>
  )
}
