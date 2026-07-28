import { CockpitSection } from '@/components/admin/cockpit-section'
import { PageHeader } from '@/components/admin/page-header'
import { AdminBody, AdminPage, AdminSurfaceHeader } from '@/components/admin/typography'
import {
  AdminSection,
  AdminSourceAttendue,
  AdminSurface,
} from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

const SECTIONS = [
  {
    id: 'overview',
    title: 'Vue d’ensemble',
    description: 'Équipe, journal et accès',
    links: [] as const,
  },
  {
    id: 'equipe',
    title: 'Équipe et accès',
    description: 'Comptes, rôles et sessions',
    links: [] as const,
  },
  {
    id: 'produit',
    title: 'Produit',
    description: 'Surfaces métier du fonds',
    links: [
      { href: '/admin/administration/produit', libelle: 'Vue produit consolidée', aide: 'Mining, BTC, fiche, backtest' },
      { href: '/admin/dashboard', libelle: 'Couverture des 18 surfaces', aide: 'État exact par champ' },
      { href: '/admin/vault', libelle: 'Portefeuille DynaVault', aide: 'Stratégies et capacité' },
      { href: '/admin/mining', libelle: 'Minage (brut)', aide: 'GET /api/v1/mining' },
      { href: '/admin/btc', libelle: 'Bitcoin (brut)', aide: 'GET /api/v1/btc' },
      { href: '/admin/product', libelle: 'Fiche produit (brut)', aide: 'GET /api/v1/product/factsheet' },
      { href: '/admin/backtest', libelle: 'Rétro-test (brut)', aide: 'GET /api/v1/backtest/historical' },
    ],
  },
  {
    id: 'infra',
    title: 'Infrastructure',
    description: 'Runtime, dépendances et déploiement',
    links: [
      { href: '/admin/runtime', libelle: 'Runtime', aide: 'Health, ready, base, indexeur' },
    ],
  },
  {
    id: 'contracts',
    title: 'Smart contracts',
    description: 'Lecture on-chain via runtime et vault',
    links: [
      { href: '/admin/vault', libelle: 'État vault et stratégies', aide: 'Adresses et allocations' },
      { href: '/admin/series-1', libelle: 'Événements Series 1', aide: 'Journal indexé' },
    ],
  },
  {
    id: 'api',
    title: 'API Explorer',
    description: 'Registre canonique des endpoints',
    links: [{ href: '/admin/api-explorer', libelle: 'Explorateur d’API', aide: '26 routes du contrat' }],
  },
  {
    id: 'indexers',
    title: 'Indexers et jobs',
    description: 'Planificateur et relève des mouvements',
    links: [{ href: '/admin/runtime', libelle: 'État indexeur', aide: 'runtime · indexerScheduler' }],
  },
  {
    id: 'keeper',
    title: 'Keeper',
    description: 'Actions de maintenance admin',
    links: [{ href: '/admin/keeper', libelle: 'Actions keeper', aide: '6 POST — confirmation explicite' }],
  },
  {
    id: 'audit',
    title: 'Audit',
    description: 'Journal d’administration',
    links: [] as const,
  },
  {
    id: 'config',
    title: 'Configuration',
    description: 'Variables d’environnement et profil',
    links: [{ href: '/admin/profile', libelle: 'Profil connecté', aide: 'GET /api/v1/profile' }],
  },
] as const

function ListeLiens({
  items,
}: Readonly<{ items: readonly { href: string; libelle: string; aide: string }[] }>) {
  if (items.length === 0) return null
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
            <span aria-hidden="true" className="shrink-0 text-zinc-500 dark:text-zinc-400">→</span>
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
      <PageHeader
        title="Administration"
        description="Équipe, produit, infrastructure et outils techniques — organisés par sous-section."
      />

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

      {SECTIONS.filter((s) => s.links.length > 0).map((section) => (
        <AdminSection key={section.id} title={section.title} description={section.description}>
          <AdminSurface>
            <ListeLiens items={section.links} />
          </AdminSurface>
        </AdminSection>
      ))}

      <AdminSection title="Sources" description="Rôles, permissions et contrats">
        <AdminSourceAttendue
          quoi="Rôles, permissions et smart contracts dédiés"
          detail="Pas de surface smart contracts autonome : les lectures passent par vault, runtime et series-1. Pas d’action on-chain simulée."
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
