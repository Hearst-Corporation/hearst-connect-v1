import { DashCard, DashboardHeader } from '@/components/admin/dashboard'
import { Callout } from '@/components/compositions'
import { loadDocuments } from '@/features/client-portal/load'
import { requireSession } from '@/lib/auth'
import { DocumentTextIcon } from '@heroicons/react/20/solid'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Documents' }
export const dynamic = 'force-dynamic'

const KIND: Record<string, string> = { statement: 'Monthly statements', tax: 'Annual reports', proposal: 'Proposals & terms' }

/**
 * DOCUMENTS — ce qu'un client garde et transmet : ses relevés mensuels (un
 * par vault et par mois clos), ses rapports annuels, ses propositions signées.
 * Chacun s'ouvre en page imprimable, « Download PDF ».
 */
export default async function DocumentsPage() {
  await requireSession()
  const docs = await loadDocuments()
  return (
    <>
      <DashboardHeader title="Documents" description="Statements, annual reports and the terms you signed — ready to download." kpis={[]} />
      {docs === null ? (
        <Callout tone="warning" title="Your documents could not be read">
          Nothing is shown rather than a guess.
        </Callout>
      ) : (
        (['statement', 'tax', 'proposal'] as const).map((kind) => {
          const list = docs.filter((d) => d.kind === kind)
          if (list.length === 0) return null
          return (
            <DashCard key={kind} title={KIND[kind]} subtitle={`${list.length} document${list.length === 1 ? '' : 's'}`}>
              <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
                {list.map((d) => {
                  const href =
                    d.kind === 'proposal' && d.offerId
                      ? `/proposal/${d.offerId}`
                      : `/account/documents/statement?${d.kind === 'tax' ? `year=${d.period.slice(0, 4)}` : `month=${d.period}&vault=${encodeURIComponent(d.vaultId ?? '')}`}`
                  return (
                    <li key={d.id}>
                      <Link href={href} className="group flex items-center gap-3 py-3 no-underline first:pt-0 last:pb-0">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-fg-secondary">
                          <DocumentTextIcon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm text-fg">{d.title}</span>
                          <span className="truncate text-xs text-fg-tertiary">{d.vault}</span>
                        </span>
                        <span className="text-xs text-fg-tertiary transition-colors group-hover:text-fg">Open PDF →</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </DashCard>
          )
        })
      )}
    </>
  )
}
