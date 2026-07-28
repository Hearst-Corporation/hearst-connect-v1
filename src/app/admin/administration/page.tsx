import { CockpitSection } from '@/components/admin/cockpit-section'
import { PageHeader } from '@/components/admin/page-header'
import { AdminBody, AdminPage, AdminSurfaceHeader } from '@/components/admin/typography'
import { AdminSection, AdminSourceAttendue, AdminSurface } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

/**
 * Administration — le compte, l'audit, et les trois écrans secondaires.
 *
 * Cette page était devenue un annuaire de liens qui doublait la navigation :
 * chaque entrée de la sidebar y figurait une seconde fois, doublée d'un nom de
 * route (« Minage (brut) — GET /api/v1/mining »). Deux chemins vers le même
 * écran, dont un écrit en jargon d'API.
 *
 * Ne restent ici que les choses qu'elle SEULE porte : qui est connecté, le
 * journal des décisions, et les trois écrans volontairement tenus hors du menu
 * principal parce qu'ils ne servent pas au parcours quotidien.
 */

/** Écrans absents de la navigation — leur seul point d'entrée. */
const ECRANS_SECONDAIRES = [
  {
    href: '/admin/administration/produit',
    libelle: 'Vue produit consolidée',
    aide: 'Production, réserve et rémunération sur un seul écran',
  },
  {
    href: '/admin/dashboard',
    libelle: 'Couverture des données',
    aide: 'Ce que le service sert réellement, surface par surface',
  },
  {
    href: '/admin/profile',
    libelle: 'Votre compte',
    aide: 'Le dossier investisseur rattaché à ce compte, s’il en existe un',
  },
] as const

function ListeLiens({
  items,
}: Readonly<{ items: readonly { href: string; libelle: string; aide: string }[] }>) {
  return (
    <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {items.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="flex items-baseline justify-between gap-4 px-5 py-3 transition hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-600"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-zinc-950 dark:text-white">{s.libelle}</span>
              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{s.aide}</span>
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
      <PageHeader title="Administration" description="Le compte connecté, le journal des décisions et les écrans secondaires." />

      <CockpitSection title="Équipe" description="Session locale et journal d’administration">
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminSurface>
            <AdminSurfaceHeader title="Équipe et accès" description="Session locale · un propriétaire déclaré" />
            <div className="px-5 py-4 sm:px-6">
              <p className="text-sm/6 text-zinc-950 dark:text-white">{session.name}</p>
              <AdminBody className="text-xs/5">{session.email}</AdminBody>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 ring-1 ring-accent-500/30 ring-inset dark:text-accent-400">
                {session.role}
              </p>
            </div>
          </AdminSurface>

          <AdminSurface>
            <AdminSurfaceHeader title="Journal des décisions" description="Audit · source en attente" />
            <div className="px-5 py-4 sm:px-6">
              <AdminBody>
                Le journal d’administration existe en base mais n’est pas encore transmis. Aucune ligne inventée.
              </AdminBody>
            </div>
          </AdminSurface>
        </div>
      </CockpitSection>

      <AdminSection title="Écrans secondaires" description="Hors navigation principale — ils ne servent pas au quotidien">
        <AdminSurface>
          <ListeLiens items={ECRANS_SECONDAIRES} />
        </AdminSurface>
      </AdminSection>

      <AdminSection title="Sources" description="Rôles, permissions et contrats">
        <AdminSourceAttendue
          quoi="Rôles, permissions et smart contracts dédiés"
          detail="Pas de surface smart contracts autonome : les lectures passent par le portefeuille, l’état du service et le journal Série 1. Aucune action on-chain simulée."
          requis={[
            'Rôles conformité et opérations distincts',
            'Journal d’administration lisible',
            'Endpoints dédiés contrats si lecture owner/rôles/pause requise',
          ]}
        />
      </AdminSection>
    </AdminPage>
  )
}
