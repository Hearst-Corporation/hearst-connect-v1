import { PageHeader } from '@/components/admin/page-header'
import { AdminPage } from '@/components/admin/typography'
import {
  AdminEmptyState,
  AdminSection,
  AdminSourceAttendue,
  AdminSurface,
  AdminTable,
  AdminToolbar,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — structure ready for the organisations/investors directory.
 * No row is invented until the backend exposes the source.
 */

const EXPECTED_COLUMNS = [
  'Organization',
  'Type',
  'Status',
  'Compliance',
  'Risk',
  'AUM',
  'Last activity',
  'Linked people',
  'Portfolio',
] as const

type EmptyRow = Record<string, never>

function emptyCell(_row: EmptyRow) {
  return <span className="text-zinc-500 dark:text-zinc-400">—</span>
}

const COLUMNS: readonly AdminTableColumn<EmptyRow>[] = EXPECTED_COLUMNS.map((header) => ({
  key: header,
  header,
  cell: emptyCell,
}))

export default function Page() {
  return (
    <AdminPage>
      <PageHeader
        title="Clients"
        description="Organizations, people and portfolios — directory awaiting a backend source."
      />

      <AdminSection title="Directory" description="Table ready — no simulated data" index="01">
        <AdminToolbar>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Search — inactive</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">·</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Filters — awaiting source</span>
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            Sorting and pagination available once the source arrives
          </span>
        </AdminToolbar>
        <AdminSurface>
          <AdminTable
            rows={[]}
            keyFn={() => ''}
            empty={
              <AdminEmptyState
                title="The organizations directory isn’t open yet"
                description="The service isn’t transmitting any organizations. This structure will host the data without a graphical redesign."
              />
            }
            columns={COLUMNS}
          />
        </AdminSurface>
      </AdminSection>

      <AdminSection title="Sources" description="What the service still needs to expose" index="02">
        <AdminSourceAttendue
          quoi="Expected endpoints"
          detail="Organizations and investors aren’t exposed over HTTP yet."
          requis={[
            'Organization entity in the data model',
            'GET directory endpoint with AUM, compliance and risk',
            'Linking to people, portfolios and subscriptions',
          ]}
        />
      </AdminSection>
    </AdminPage>
  )
}
