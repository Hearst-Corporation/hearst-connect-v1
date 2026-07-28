import { PageHeader } from '@/components/admin/page-header'
import {
  AdminFilterBar,
  AdminSection,
  AdminSourceAttendue,
  AdminSurface,
  AdminTable,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Compliance' }
export const dynamic = 'force-dynamic'

const SEGMENTS = [
  { id: 'a-verifier', label: 'To review', hint: 'Case received, review not started' },
  { id: 'en-attente', label: 'Pending', hint: 'Document or response awaited from client' },
  { id: 'risque-eleve', label: 'High risk', hint: 'Sanctions, PEP, or adverse media signal' },
  { id: 'a-renouveler', label: 'Due for renewal', hint: 'Verification has reached its due date' },
  { id: 'termine', label: 'Completed', hint: 'Decision rendered and logged' },
] as const

const CASE_COLUMNS = ['Reference', 'Organization', 'Segment', 'Age', 'Due date', 'Risk', 'Analyst'] as const

type EmptyRow = Record<string, never>

function emptyCell(_row: EmptyRow) {
  return <span className="text-zinc-500 dark:text-zinc-400">—</span>
}

const COLUMNS: readonly AdminTableColumn<EmptyRow>[] = CASE_COLUMNS.map((header) => ({
  key: header,
  header,
  cell: emptyCell,
}))

const FILTER_ITEMS = SEGMENTS.map((s) => ({ id: s.id, label: s.label, title: s.hint }))

export default function Page() {
  return (
    <AdminPage>
      <PageHeader
        title="Compliance"
        description="KYC/KYB review queue. Case journey segments — counters stay empty until a source is connected."
      />

      <AdminSection title="Segments" description="A KYC case's journey">
        <AdminFilterBar ariaLabel="Compliance segments" items={FILTER_ITEMS} />
      </AdminSection>

      <AdminSection title="Work queue" description="Cases submitted by the backend — currently empty">
        <AdminSurface>
          <AdminTable
            rows={[]}
            keyFn={() => ''}
            empty={
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">No cases submitted</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
                  The segments above describe the real journey. No zero is shown — that would imply there is nothing to process.
                </p>
              </div>
            }
            columns={COLUMNS}
          />
        </AdminSurface>
      </AdminSection>

      <AdminSection title="Sources" description="KYC/KYB endpoints pending">
        <AdminSourceAttendue
          quoi="KYC/KYB endpoints pending"
          detail="Case detail (UBO, sanctions, PEP, history) will open in a side panel once the source is connected."
          requis={[
            'Reading cases with status, age, and due date',
            'Detail: beneficial owners, documents, sanctions and PEP checks',
            'Decision actions only if exposed by the backend',
            'Analyst assignment and decision log',
          ]}
        />
      </AdminSection>
    </AdminPage>
  )
}
