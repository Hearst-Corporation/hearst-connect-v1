import { ArrowRightIcon } from '@heroicons/react/20/solid'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import { surfaceRaised } from '@/components/admin/surface'
import { AdminBody, AdminLabel, AdminPage, AdminSurfaceHeader, adminTypography } from '@/components/admin/typography'
import { AdminSection, AdminSourceAttendue, AdminSurface } from '@/components/admin/surfaces'
import {
  ADMIN_SECONDARY,
  CLIENTS_ENTRY,
  VAULT_REGISTRY_ENTRY,
  type EntreeSecondaire,
  type IconeNav,
} from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

/**
 * Administration — who is signed in, what was decided, and the way in to
 * every screen that is not one of the five primary destinations.
 *
 * Three composition decisions carry this page:
 *
 * 1. **The two facts at the top are sized to their facts.** The account card
 *    holds a name, an email and a role; the decision log holds one sentence
 *    about an absent source. They used to sit in two half-width panels tall
 *    enough for a table, which read as empty boxes. They now share one grid
 *    row — account on 4 columns, decision log on 8 — and their height is
 *    whatever their content needs.
 *
 * 2. **This page is the only entry point to the twelve secondary screens**,
 *    since the sidebar was cut down to five. That reachability has to be
 *    obvious at a glance, so the screens are rendered as a dense grouped
 *    list — one column per subject, one row per screen — and not as twelve
 *    cards, which would bury twelve short labels under twelve frames. The
 *    list reads from `ADMIN_SECONDARY`: adding a screen is one entry there,
 *    never a second hard-coded copy here.
 *
 * 3. **Administration carries no vault data.** The console is organised
 *    around vaults, and the temptation is to greet the reader here with how
 *    many there are and what they hold. That belongs to the dashboard, which
 *    is operating state; this page is configuration and system management.
 *    Repeating a figure here would create a second place to keep in sync and
 *    a second place to be wrong — so the vault registry appears as a way in,
 *    never as a summary.
 */

/** Twelve today — read from the source of truth so this page can never quote a stale count. */
const NOMBRE_ECRANS = ADMIN_SECONDARY.reduce((total, groupe) => total + groupe.entrees.length, 0)

/**
 * A destination given its own surface rather than a row in the index.
 *
 * Only two earn it. The vault registry, because every portfolio screen in the
 * console is a view onto the set of vaults and this is the door to it; and the
 * client directory, because it is the only entry point Administration must
 * expose that is a PRIMARY route, and therefore absent from `ADMIN_SECONDARY`
 * — without this card it would be the one destination unreachable from the
 * page that exists to make every destination reachable.
 *
 * The card carries a label and a sentence. No count, no amount, no status: a
 * navigational surface that quotes a figure has to be kept true, and this page
 * reads no vault.
 */
function FeaturedDestination({
  href,
  libelle,
  icone: Icone,
  detail,
}: Readonly<{ href: string; libelle: string; icone: IconeNav; detail: string }>) {
  return (
    <Link
      href={href}
      className={clsx(
        surfaceRaised,
        'group flex h-full items-start gap-4 p-5 transition sm:p-6',
        'hover:ring-accent-500/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:hover:ring-accent-400/40',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-500/10 ring-1 ring-accent-500/25 ring-inset"
      >
        <Icone className="size-5 text-accent-600 dark:text-accent-400" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          {/* The surface-title scale, on a `span`: this heading lives inside an
              anchor, and a real <h3> here would announce a heading level for
              what is a link, not a section. */}
          <span className={adminTypography.surfaceTitle}>{libelle}</span>
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-accent-500 dark:text-zinc-500"
          />
        </span>
        <AdminBody className="mt-1 max-w-prose">{detail}</AdminBody>
      </span>
    </Link>
  )
}

/**
 * One screen, one row: icon, label, and the single line that says what this
 * screen carries that no other one does. No ring, no card — the row is dense
 * enough that twelve of them stay scannable side by side.
 */
function SecondaryRow({ entree }: Readonly<{ entree: EntreeSecondaire }>) {
  const Icone = entree.icone

  return (
    <li>
      <Link
        href={entree.href}
        className="group -mx-2 flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-zinc-950/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600 dark:hover:bg-white/[0.05]"
      >
        <Icone
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-zinc-400 transition group-hover:text-accent-500 dark:text-zinc-500"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm/5 font-medium text-zinc-950 dark:text-white">
            {entree.libelle}
          </span>
          <span className="mt-0.5 block text-xs/5 text-zinc-500 dark:text-zinc-400">{entree.detail}</span>
        </span>
      </Link>
    </li>
  )
}

export default async function Page() {
  const session = await requireSession()

  return (
    <AdminPage>
      <PageHeader
        title="Administration"
        description="The signed-in account, the decision log, and the way in to every other screen."
      />

      {/*
        No section heading above this row: the page title already names it, and
        an H2 repeating "Team" between the H1 and two cards only flattens the
        hierarchy the review asked us to restore.
      */}
      <AdminGrid>
        <AdminCol span={4} md={4}>
          <AdminSurface className="p-5 sm:p-6">
            <AdminSurfaceHeader
              title="Account and access"
              description="Local session · one declared owner"
              action={
                <span className="inline-flex items-center rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 ring-1 ring-accent-500/30 ring-inset dark:text-accent-400">
                  {session.role}
                </span>
              }
            />
            <p className="text-sm/6 font-medium text-zinc-950 dark:text-white">{session.name}</p>
            <AdminBody className="text-xs/5">{session.email}</AdminBody>
          </AdminSurface>
        </AdminCol>

        <AdminCol span={8} md={4}>
          <AdminSurface className="p-5 sm:p-6">
            <AdminSurfaceHeader title="Decision log" description="Audit trail · source pending" />
            <AdminBody className="max-w-prose">
              The administration log exists in the database but is not yet exposed. No row is invented.
            </AdminBody>
          </AdminSurface>
        </AdminCol>
      </AdminGrid>

      <AdminSection
        title="All screens"
        description={`Every destination the console has, reachable from one place. The vault registry leads, because every other portfolio screen is a view onto it; all ${NOMBRE_ECRANS} screens outside the main navigation are then grouped below by subject.`}
      >
        {/*
          `items-stretch` is deliberate here and nowhere else on the page: these
          two cards are peers on the same row, and letting one end two lines
          short of the other reads as a mistake rather than as a card sized to
          its content. Registry on 8, directory on 4 — the registry is the one
          the console is organised around, and the weighting says so.
        */}
        <AdminGrid className="items-stretch">
          <AdminCol span={8} md={8}>
            <FeaturedDestination
              href={VAULT_REGISTRY_ENTRY.href}
              libelle={VAULT_REGISTRY_ENTRY.libelle}
              icone={VAULT_REGISTRY_ENTRY.icone}
              detail={VAULT_REGISTRY_ENTRY.detail}
            />
          </AdminCol>
          <AdminCol span={4} md={8}>
            <FeaturedDestination
              href={CLIENTS_ENTRY.href}
              libelle="Client directory"
              icone={CLIENTS_ENTRY.icone}
              detail="Organizations and their portfolios, and what the service must expose before one is listed."
            />
          </AdminCol>
        </AdminGrid>

        {/*
          Four groups on three columns each: the row adds up to exactly twelve,
          so no group is stranded on the left of an empty row. Below `lg` the
          groups fall back to two columns, then to a single stack.
        */}
        <AdminGrid as="nav" aria-label="Secondary screens">
          {ADMIN_SECONDARY.map((groupe) => (
            <AdminCol key={groupe.titre} span={3} md={4}>
              <AdminLabel className="border-b border-zinc-950/10 pb-2 dark:border-console-line">
                {groupe.titre}
              </AdminLabel>
              <ul aria-label={groupe.titre} className="mt-2 space-y-0.5">
                {groupe.entrees.map((entree) => (
                  <SecondaryRow key={entree.href} entree={entree} />
                ))}
              </ul>
            </AdminCol>
          ))}
        </AdminGrid>
      </AdminSection>

      <AdminSection title="Sources" description="Roles, permissions, and contracts">
        {/* One state, one card. The requirement list is part of it, not a second surface inside it. */}
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
