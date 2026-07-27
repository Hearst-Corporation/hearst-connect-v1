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
const VUES_DIAGNOSTIC = [
  { href: '/admin/mining', libelle: 'Minage', aide: 'Réponse brute des trois routes' },
  { href: '/admin/btc', libelle: 'Bitcoin', aide: 'Réponse brute' },
  { href: '/admin/product', libelle: 'Fiche produit', aide: 'Termes contractuels, réponse brute' },
  { href: '/admin/series-1', libelle: 'Série 1', aide: 'Mouvements relevés, réponse brute' },
  { href: '/admin/backtest', libelle: 'Rétro-test', aide: 'Réponse brute' },
  { href: '/admin/profile', libelle: 'Profil', aide: 'Identité du compte connecté' },
] as const

const INFRASTRUCTURE_TECHNIQUE = [
  { href: '/admin/runtime', libelle: 'État détaillé du service', aide: 'Base, chaîne, relevé des mouvements' },
  { href: '/admin/api-explorer', libelle: 'Explorateur de routes', aide: 'Appel unitaire de chaque route du registre' },
  { href: '/admin/keeper', libelle: 'Actions de maintenance', aide: 'Désarmées par défaut' },
] as const

function ListeLiens({ items }: Readonly<{ items: readonly { href: string; libelle: string; aide: string }[] }>) {
  return (
    <ul className="divide-y divide-zinc-300">
      {items.map((s) => (
        <li key={s.href}>
          <Link
            href={s.href}
            className="group flex items-baseline justify-between gap-6 px-5 py-5 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-black"
          >
            <span className="min-w-0">
              <span className="block text-base font-normal text-black">{s.libelle}</span>
              <span className="mt-1 block text-sm leading-5 text-zinc-600">{s.aide}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-zinc-600 transition-transform group-hover:translate-x-1">
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
    <div className="space-y-12">
      <PageHeader
        title="Administration"
        description="L’équipe, les traces d’activité, les réglages — et les outils techniques, disponibles sans être imposés."
      />

      <section aria-labelledby="gouvernance" className="space-y-5">
        <div className="border-t border-zinc-300 pt-5">
          <p className="text-xs tracking-[0.18em] text-zinc-600 uppercase">01</p>
          <h2 id="gouvernance" className="mt-3 text-3xl font-normal tracking-tight text-black">
            Gouvernance
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Identités habilitées, décisions administratives et attribution des responsabilités.
          </p>
        </div>

        <Card>
          <CardHeader title="Accès et décisions" hint="La gouvernance actuellement vérifiable" />
          <div className="grid divide-y divide-zinc-300 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            <div className="px-5 py-6">
              <p className="text-xs tracking-[0.14em] text-zinc-600 uppercase">Compte propriétaire</p>
              <p className="mt-5 text-lg font-normal text-black">{session.name}</p>
              <p className="mt-1 text-sm text-zinc-600">{session.email}</p>
              <p className="mt-6 border-t border-zinc-300 pt-4 text-sm leading-6 text-zinc-600">
                Un seul compte propriétaire est déclaré aujourd’hui. L’ajout de membres, les rôles distincts et les
                délégations attendent leur source.
              </p>
            </div>
            <div className="px-5 py-6">
              <p className="text-xs tracking-[0.14em] text-zinc-600 uppercase">Journal des décisions</p>
              <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-600">
                Le journal d’administration existe en base mais n’est pas encore transmis. Aucune ligne n’est inventée
                ici : tant qu’il n’est pas lisible, cette zone reste vide.
              </p>
            </div>
          </div>
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
      </section>

      <section aria-labelledby="produit" className="space-y-5">
        <div className="border-t border-zinc-300 pt-5">
          <p className="text-xs tracking-[0.18em] text-zinc-600 uppercase">02</p>
          <h2 id="produit" className="mt-3 text-3xl font-normal tracking-tight text-black">
            Produit
          </h2>
        </div>
        <Card>
          <CardHeader title="Surfaces produit" hint="Le portefeuille, le minage et le bitcoin" />
          <ListeLiens items={SURFACES_PRODUIT} />
        </Card>
      </section>

      <section aria-labelledby="infrastructure" className="space-y-5">
        <div className="border-t border-zinc-300 pt-5">
          <p className="text-xs tracking-[0.18em] text-zinc-600 uppercase">03</p>
          <h2 id="infrastructure" className="mt-3 text-3xl font-normal tracking-tight text-black">
            Infrastructure technique
          </h2>
        </div>
        <Card>
          <CardHeader title="Outils techniques" hint="Disponibles sans occuper le premier plan" />
          <ListeLiens items={INFRASTRUCTURE_TECHNIQUE} />
        </Card>
      </section>

      <section aria-labelledby="diagnostic" className="space-y-5">
        <div className="border-t border-zinc-300 pt-5">
          <p className="text-xs tracking-[0.18em] text-zinc-600 uppercase">04</p>
          <h2 id="diagnostic" className="mt-3 text-3xl font-normal tracking-tight text-black">
            Vues de diagnostic
          </h2>
        </div>
        <Card>
          <CardHeader title="Réponses brutes" hint="Pour vérifier un champ précis, sans mise en forme" />
          <ListeLiens items={VUES_DIAGNOSTIC} />
        </Card>
      </section>
    </div>
  )
}
