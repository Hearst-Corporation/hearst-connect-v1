import { PageHeader } from '@/components/admin/page-header'
import { AdminBody, AdminPage, AdminSurfaceHeader } from '@/components/admin/typography'
import { AdminSection, AdminSourceAttendue, AdminSurface } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

/**
 * Administration — the current account, the audit trail, and the three secondary screens.
 *
 * This page used to be a link directory that duplicated the navigation:
 * every sidebar entry showed up here a second time, paired with a route name
 * (e.g. "Mining (raw) — GET /api/v1/mining"). Two paths to the same screen,
 * one of them written in API jargon.
 *
 * Only what this page ALONE carries remains: who is signed in, the decision
 * log, and the three screens deliberately kept out of the main menu because
 * they aren't part of the daily workflow.
 */

/** Screens absent from the navigation — their only entry point. */
const SECONDARY_SCREENS = [
  {
    href: '/admin/administration/produit',
    label: 'Consolidated product view',
    hint: 'Production, reserve, and compensation on a single screen',
  },
  {
    href: '/admin/dashboard',
    label: 'Data coverage',
    hint: 'What the service actually serves, surface by surface',
  },
  {
    href: '/admin/profile',
    label: 'Your account',
    hint: 'The investor record linked to this account, if one exists',
  },
] as const

function LinkList({
  items,
}: Readonly<{ items: readonly { href: string; label: string; hint: string }[] }>) {
  return (
    <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {items.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="flex items-baseline justify-between gap-4 px-5 py-3 transition hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-zinc-950 dark:text-white">{s.label}</span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{s.hint}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-zinc-500 dark:text-zinc-400">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default async function Page() {
  const session = await requireSession()

  return (
    <AdminPage>
      <PageHeader title="Administration" description="The signed-in account, the decision log, and the secondary screens." />

      <AdminSection title="Team" description="Local session and administration log">
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminSurface>
            <AdminSurfaceHeader title="Team and access" description="Local session · one declared owner" />
            <div className="px-5 py-4 sm:px-6">
              <p className="text-sm/6 text-zinc-950 dark:text-white">{session.name}</p>
              <AdminBody className="text-xs/5">{session.email}</AdminBody>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 ring-1 ring-accent-500/30 ring-inset dark:text-accent-400">
                {session.role}
              </p>
            </div>
          </AdminSurface>

          <AdminSurface>
            <AdminSurfaceHeader title="Decision log" description="Audit · source pending" />
            <div className="px-5 py-4 sm:px-6">
              <AdminBody>
                The administration log exists in the database but is not yet exposed. No row is invented.
              </AdminBody>
            </div>
          </AdminSurface>
        </div>
      </AdminSection>

      <AdminSection title="Secondary screens" description="Outside the main navigation — not part of the daily workflow">
        <AdminSurface>
          <LinkList items={SECONDARY_SCREENS} />
        </AdminSurface>
      </AdminSection>

      <AdminSection title="Sources" description="Roles, permissions, and contracts">
        <AdminSourceAttendue
          quoi="Roles, permissions, and dedicated smart contracts"
          detail="No standalone smart-contract surface: reads go through the wallet, the service state, and the Series 1 log. No on-chain action is simulated."
          requis={[
            'Distinct compliance and operations roles',
            'Readable administration log',
            'Dedicated contract endpoints if owner/roles/pause reads are required',
          ]}
        />
      </AdminSection>
    </AdminPage>
  )
}
