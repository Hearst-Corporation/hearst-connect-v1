import { PageHeader } from '@/components/admin/page-header'
import { RequirementList } from '@/components/admin/surface'
import { AdminSection, AdminSurface } from '@/components/admin/surfaces'
import { AdminBody, AdminLabel, AdminPage, AdminSurfaceTitle } from '@/components/admin/typography'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — the organizations directory, before it has a source.
 *
 * The screen used to be three boxes deep to deliver a single piece of news.
 * A toolbar carrying a search field that searches nothing, a card wrapping a
 * nine-column table that never drew a row — `AdminTable` returns its empty
 * state and discards the columns entirely when there is nothing to list, so
 * those definitions were structure no reader ever saw — and underneath, a
 * second card repeating the same absence in different words. One state says
 * it once.
 *
 * What survives is the part that carries information: the shape the directory
 * has already been agreed to take, and what the service has to expose before
 * a single row can appear. Both of those are lists today, so they render as
 * lists — not as a table with nothing in it.
 */

/** The columns the directory will carry once organizations are exposed. */
const PLANNED_COLUMNS = [
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

/** What the backend still owes this screen. */
const MISSING_FROM_SOURCE = [
  'Organization entity in the data model',
  'GET directory endpoint with AUM, compliance and risk',
  'Linking to people, portfolios and subscriptions',
] as const

export default function Page() {
  return (
    <AdminPage>
      <PageHeader
        title="Clients"
        description="Organizations, people and portfolios. The directory opens the day the backend exposes a source — until then nothing is listed, because nothing is known."
      />

      <AdminSection
        title="Directory"
        description="No row is invented while the source is missing, and no empty table is drawn to stand in for one."
      >
        <AdminSurface padding>
          <AdminSurfaceTitle as="p">The organizations directory isn’t open yet</AdminSurfaceTitle>
          <AdminBody className="mt-1.5 max-w-prose">
            The service transmits no organization. This screen will host them without a graphical
            redesign: the columns are already agreed, only the data is missing.
          </AdminBody>

          {/* Two declared tracks inside the one card. The alternative — a card
              for the shape and a second card for the gap — was two surfaces
              saying the same thing about the same absence. */}
          <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <div className="min-w-0">
              <AdminLabel>Columns the directory will carry</AdminLabel>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {PLANNED_COLUMNS.map((colonne) => (
                  <li
                    key={colonne}
                    className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {colonne}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <AdminLabel>What the service must expose first</AdminLabel>
              <RequirementList requis={MISSING_FROM_SOURCE} />
            </div>
          </div>
        </AdminSurface>
      </AdminSection>
    </AdminPage>
  )
}
