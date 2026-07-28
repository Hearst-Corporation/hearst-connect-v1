import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { PageHeader } from '@/components/admin/page-header'
import { RequirementList } from '@/components/admin/surface'
import { AdminSection, AdminSurface } from '@/components/admin/surfaces'
import { AdminBody, AdminCaption, AdminLabel, AdminPage, AdminSurfaceTitle } from '@/components/admin/typography'
import { DATA_COVERAGE_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — the organizations directory, before it has a source.
 *
 * ── What this screen is allowed to say ────────────────────────────────────
 * The service exposes no client directory: `GET /api/v1/clients` answers 404
 * (verified against the production backend, 2026-07-28). That is an absence,
 * not an empty directory, and the two are opposite facts — "this operator has
 * no clients" would be a claim, and we have no reading that supports it. So
 * the screen states that nothing can be enumerated, and lists nothing.
 *
 * ── Why there is a link out of it ─────────────────────────────────────────
 * An honest empty state that leaves the reader with nowhere to go is still a
 * dead end. A client is not unreachable today, only un-enumerable: a vault
 * names the client it belongs to whenever the service provides one, so the
 * vault registry is the one place client context exists. The bridge below is
 * that route, plus a single link to Data coverage for the technical account
 * of what is and is not served.
 *
 * ── Why it stays one card ─────────────────────────────────────────────────
 * The screen used to be three boxes deep to deliver a single piece of news: a
 * toolbar carrying a search field that searched nothing, a card wrapping a
 * nine-column table that never drew a row, and underneath, a second card
 * repeating the same absence in different words. One state says it once, and
 * an empty state does not grow into a second dashboard.
 */

/** What the backend still owes this screen, in the order it would have to arrive. */
const MISSING_FROM_SOURCE = [
  'A client directory endpoint — nothing enumerates organizations today',
  'A client identifier carried by each vault, so a vault can be attributed',
  'Compliance state and activity per client, if either is to be shown',
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
          <AdminSurfaceTitle as="p">Client directory not exposed by the service</AdminSurfaceTitle>
          <AdminBody className="mt-1.5 max-w-prose">
            No endpoint enumerates organizations, so this console cannot name a single one — and does
            not stand in for the answer with a count or an empty table. This screen will host the
            directory without a graphical redesign the day a source exists.
          </AdminBody>

          {/* Two declared tracks inside the one card: where a client IS reachable
              today, and what has to arrive before this screen lists one. The
              alternative — a card for the bridge and a second card for the gap —
              was two surfaces saying the same thing about the same absence. */}
          <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-2">
            <div className="min-w-0">
              <AdminLabel>Where a client is reachable today</AdminLabel>
              <AdminBody className="mt-2 max-w-prose">
                Through the vault it holds. Each vault in the registry names its client whenever the
                service provides one, so the registry — not this screen — is where a client-to-vault
                relationship can be read at all.
              </AdminBody>
              <Link
                href={VAULT_REGISTRY_ENTRY.href}
                className="group mt-3 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-accent-700 transition hover:text-accent-600 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:text-accent-400 dark:hover:text-accent-300"
              >
                {VAULT_REGISTRY_ENTRY.libelle}
                <ArrowRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 transition group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            <div className="min-w-0">
              <AdminLabel>What the service must expose first</AdminLabel>
              <RequirementList requis={MISSING_FROM_SOURCE} />
            </div>
          </div>

          <AdminCaption className="mt-6">
            Source ·{' '}
            <Link
              href={DATA_COVERAGE_ENTRY.href}
              className="rounded-sm underline decoration-zinc-400/60 underline-offset-2 transition hover:text-zinc-950 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:hover:text-white"
            >
              {DATA_COVERAGE_ENTRY.libelle}
            </Link>{' '}
            records which routes answer and which do not.
          </AdminCaption>
        </AdminSurface>
      </AdminSection>
    </AdminPage>
  )
}
