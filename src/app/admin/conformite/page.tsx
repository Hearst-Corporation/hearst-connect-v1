import { AdminTableSplit } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { RequirementList } from '@/components/admin/surface'
import { AdminSection, AdminSurface, AdminTable, type AdminTableColumn } from '@/components/admin/surfaces'
import { AdminBody, AdminLabel, AdminPage, AdminSurfaceTitle } from '@/components/admin/typography'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

/**
 * Compliance — the KYC/KYB review queue, before it has a source.
 *
 * Three sections used to announce the same absence three times: a bar of
 * filter chips that filter nothing, each trailing a dash where a count would
 * go; a card wrapping a table that never drew a row; and a third card listing
 * the endpoints still missing. A reader had to cross two boxes to learn one
 * fact.
 *
 * It reads as one section now. The absence is stated once, in the main
 * column, with what the source owes it. The five journey stages move into the
 * deliberate secondary column, where they are what they always were —
 * a description of the process, not a set of counters at zero. Their
 * explanation used to hide in a `title` attribute; it is on screen now.
 */

const SEGMENTS = [
  { id: 'a-verifier', label: 'To review', hint: 'Case received, review not started' },
  { id: 'en-attente', label: 'Pending', hint: 'Document or response awaited from client' },
  { id: 'risque-eleve', label: 'High risk', hint: 'Sanctions, PEP, or adverse media signal' },
  { id: 'a-renouveler', label: 'Due for renewal', hint: 'Verification has reached its due date' },
  { id: 'termine', label: 'Completed', hint: 'Decision rendered and logged' },
] as const

type QueuePlaceholderRow = Readonly<{
  reference: string
  organization: string
  segment: string
  age: string
  dueDate: string
  risk: string
  analyst: string
}>

const PLACEHOLDER_QUEUE_ROWS: readonly QueuePlaceholderRow[] = [
  {
    reference: 'Unavailable',
    organization: 'No case exposed by service',
    segment: '—',
    age: '—',
    dueDate: '—',
    risk: '—',
    analyst: '—',
  },
]

const QUEUE_COLUMNS: readonly AdminTableColumn<QueuePlaceholderRow>[] = [
  { key: 'reference', header: 'Reference', cell: (row) => row.reference },
  { key: 'organization', header: 'Organization', cell: (row) => row.organization },
  { key: 'segment', header: 'Segment', cell: (row) => row.segment },
  { key: 'age', header: 'Age', cell: (row) => row.age },
  { key: 'due-date', header: 'Due date', cell: (row) => row.dueDate },
  { key: 'risk', header: 'Risk', cell: (row) => row.risk },
  { key: 'analyst', header: 'Analyst', cell: (row) => row.analyst },
]

/** What the backend still owes this screen. */
const MISSING_FROM_SOURCE = [
  'Reading cases with status, age, and due date',
  'Detail: beneficial owners, documents, sanctions and PEP checks',
  'Decision actions only if exposed by the backend',
  'Analyst assignment and decision log',
] as const

export default function Page() {
  return (
    <AdminPage>
      <PageHeader
        title="Compliance"
        description="The KYC/KYB review queue. No case is listed and no counter is shown at zero — the service exposes no case, which is not the same statement as having none."
      />

      <AdminSection
        title="Review queue"
        description="One state for one absence, beside the journey a case will follow once the source is connected."
      >
        <AdminTableSplit
          className="items-start"
          main={
            <AdminSurface padding>
              <AdminSurfaceTitle as="p">No case submitted</AdminSurfaceTitle>
              <AdminBody className="mt-1.5 max-w-prose">
                The service exposes no case. Nothing is counted at zero here: a zero would claim
                there is nothing to process, when what we actually know is that the queue cannot be
                read at all.
              </AdminBody>

              <div className="mt-6 max-w-prose">
                <AdminLabel>What the source must expose</AdminLabel>
                <RequirementList requis={MISSING_FROM_SOURCE} />
              </div>

              <div className="mt-6">
                <AdminLabel>Columns the queue will carry</AdminLabel>
                <AdminSurface className="mt-2">
                  <AdminTable rows={PLACEHOLDER_QUEUE_ROWS} keyFn={(row) => row.reference} columns={QUEUE_COLUMNS} />
                </AdminSurface>
              </div>
            </AdminSurface>
          }
          aside={
            <AdminSurface padding>
              <AdminSurfaceTitle>A case’s journey</AdminSurfaceTitle>
              <AdminBody className="mt-1.5">
                The five stages a file goes through. They describe the process; none of them
                carries a count until cases arrive.
              </AdminBody>

              <ol className="mt-5 space-y-4">
                {SEGMENTS.map((segment, rang) => (
                  <li key={segment.id} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-[0.6875rem]/4 font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                      {rang + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-zinc-950 dark:text-white">
                        {segment.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {segment.hint}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </AdminSurface>
          }
        />
      </AdminSection>
    </AdminPage>
  )
}
