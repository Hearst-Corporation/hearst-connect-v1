import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

/**
 * Administration — l'équipe, les traces, les réglages, et le sous-sol.
 *
 * Les surfaces produit et techniques vivent ici plutôt qu'en navigation
 * principale. Elles restent accessibles en un clic, mais ne réclament plus
 * l'attention d'une équipe de conformité qui n'a rien à en faire au
 * quotidien. C'est la différence entre un outil disponible et un outil
 * imposé.
 */

const SURFACES_PRODUIT = [
  {
    href: '/admin/administration/produit',
    libelle: 'Produit',
    aide: 'Production, réserve, rémunération — six anciennes vues réunies',
  },
  { href: '/admin/dashboard', libelle: 'Détail des dix-huit surfaces', aide: 'Chaque surface et son état exact' },
  { href: '/admin/vault', libelle: 'Portefeuille, vue détaillée', aide: 'Stratégies, une par une' },
] as const

/**
 * Les vues brutes conservées telles quelles. Elles rendent la réponse du
 * service sans mise en forme : c'est leur intérêt quand on cherche à vérifier
 * un champ précis, et c'est pourquoi elles ne sont pas refondues. Elles ne
 * réclament l'attention de personne au quotidien.
 */
const VUES_BRUTES = [
  { href: '/admin/mining', libelle: 'Minage', aide: 'Réponse brute des trois routes' },
  { href: '/admin/btc', libelle: 'Bitcoin', aide: 'Réponse brute' },
  { href: '/admin/product', libelle: 'Fiche produit', aide: 'Termes contractuels, réponse brute' },
  { href: '/admin/series-1', libelle: 'Série 1', aide: 'Mouvements relevés, réponse brute' },
  { href: '/admin/backtest', libelle: 'Rétro-test', aide: 'Réponse brute' },
  { href: '/admin/profile', libelle: 'Profil', aide: 'Identité du compte connecté' },
] as const

const SURFACES_TECHNIQUES = [
  { href: '/admin/runtime', libelle: 'État détaillé du service', aide: 'Base, chaîne, relevé des mouvements' },
  { href: '/admin/api-explorer', libelle: 'Explorateur de routes', aide: 'Appel unitaire de chaque route du registre' },
  { href: '/admin/keeper', libelle: 'Actions de maintenance', aide: 'Désarmées par défaut' },
] as const

function ListeLiens({ items }: Readonly<{ items: readonly { href: string; libelle: string; aide: string }[] }>) {
  return (
    <ul className="divide-y divide-white/[0.07]">
      {items.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="flex items-baseline justify-between gap-4 px-5 py-3 transition hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-400"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-zinc-200">{s.libelle}</span>
              <span className="block truncate text-xs text-zinc-500">{s.aide}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-zinc-600">
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
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="L’équipe, les traces d’activité, les réglages — et les outils techniques, disponibles sans être imposés."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Équipe" hint="Qui accède à cette console" />
          <div className="px-5 py-4">
            <p className="text-sm text-white">{session.name}</p>
            <p className="text-xs text-zinc-500">{session.email}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent-400/10 px-2 py-0.5 text-xs font-medium text-accent-300 ring-1 ring-accent-400/30 ring-inset">
              Propriétaire
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Un seul compte propriétaire est déclaré aujourd’hui. L’ajout de membres, les rôles distincts et les
              délégations attendent leur source.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Journal des décisions" hint="Qui a fait quoi, et quand" />
          <div className="px-5 py-4">
            <p className="text-sm text-zinc-400">
              Le journal d’administration existe en base mais n’est pas encore transmis. Aucune ligne n’est inventée
              ici : tant qu’il n’est pas lisible, cette zone reste vide.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Surfaces produit" hint="Le portefeuille, le minage, le bitcoin" />
          <ListeLiens items={SURFACES_PRODUIT} />
        </Card>

        <Card>
          <CardHeader title="Outils techniques" hint="Le sous-sol — utile, jamais au premier plan" />
          <ListeLiens items={SURFACES_TECHNIQUES} />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Vues brutes"
          hint="La réponse du service, sans mise en forme — pour vérifier un champ précis"
        />
        <ListeLiens items={VUES_BRUTES} />
      </Card>

      <SourceAttendue
        quoi="Rôles, permissions et délégations attendent leur source"
        detail="Le modèle de données ne connaît aujourd’hui que deux rôles, propriétaire et investisseur. Une équipe d’opérations et une équipe de conformité ont pourtant besoin de droits distincts."
        requis={[
          'Des rôles distincts pour la conformité et pour les opérations, avec leurs permissions',
          'La lecture du journal d’administration, rendue en phrases lisibles',
          'La double authentification et la gestion des sessions actives',
        ]}
      />
    </div>
  )
}
