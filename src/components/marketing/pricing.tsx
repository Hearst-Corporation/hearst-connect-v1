// Bloc officiel Tailwind Plus — Marketing / Pricing
// « Three tiers with emphasized tier » (pricing/08), palette du projet.
// Écart assumé au bloc d'origine : le tier `featured` gardait un panneau noir et
// forçait tout son texte en blanc. Ici il reste sur fond clair et se distingue par
// un anneau accent — c'est le seul traitement spécial qu'il conserve.

import { CheckIcon } from '@heroicons/react/20/solid'

type Tier = {
  name: string
  id: string
  href: string
  price: string | { monthly: string; annually: string }
  description: string
  features: string[]
  featured: boolean
  cta: string
}

const tiers: Tier[] = [
  {
    name: 'Équipe',
    id: 'tier-equipe',
    href: '/register',
    price: { monthly: '19 €', annually: '190 €' },
    description: 'Un espace, les accès de base et le journal des 30 derniers jours.',
    features: ['Jusqu’à 10 membres', '1 espace de travail', 'Journal 30 jours', 'Support sous 48 h'],
    featured: false,
    cta: 'Commencer',
  },
  {
    name: 'Organisation',
    id: 'tier-organisation',
    href: '/register',
    price: { monthly: '49 €', annually: '490 €' },
    description: 'Plusieurs espaces, connecteurs d’annuaire et rôles personnalisés.',
    features: [
      'Membres illimités',
      'Espaces illimités',
      'Connecteurs Okta / Google / SCIM',
      'Journal 12 mois exportable',
      'Support sous 24 h',
    ],
    featured: false,
    cta: 'Commencer',
  },
  {
    name: 'Corporation',
    id: 'tier-corporation',
    href: '/register',
    price: 'Sur mesure',
    description: 'Hébergement dédié, engagements contractuels et accompagnement nommé.',
    features: [
      'Tout le plan Organisation',
      'Région d’hébergement au choix',
      'Rétention du journal sur mesure',
      'Interlocuteur dédié, réponse sous 1 h',
      'Revue de sécurité annuelle',
    ],
    featured: true,
    cta: 'Parler à l’équipe',
  },
]

export function Pricing() {
  return (
    <form id="tarifs" className="group/tiers scroll-mt-16 bg-white py-24 sm:py-32 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base/7 font-semibold text-accent-600 dark:text-accent-400">Tarifs</h2>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-6xl dark:text-white">
            Un tarif par taille d’organisation
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-zinc-600 sm:text-xl/8 dark:text-zinc-400">
          Facturation par espace, sans engagement sur les deux premiers plans. Deux mois offerts au paiement annuel.
        </p>
        <div className="mt-16 flex justify-center">
          <fieldset aria-label="Périodicité de facturation">
            <div className="grid grid-cols-2 gap-x-1 rounded-full p-1 text-center text-xs/5 font-semibold inset-ring inset-ring-zinc-200 dark:inset-ring-white/10">
              <label className="group relative rounded-full px-2.5 py-1 has-checked:bg-accent-600 dark:has-checked:bg-accent-500">
                <input
                  defaultValue="monthly"
                  defaultChecked
                  name="frequency"
                  type="radio"
                  className="absolute inset-0 appearance-none rounded-full"
                />
                <span className="text-zinc-500 group-has-checked:text-white dark:text-zinc-400">Mensuel</span>
              </label>
              <label className="group relative rounded-full px-2.5 py-1 has-checked:bg-accent-600 dark:has-checked:bg-accent-500">
                <input
                  defaultValue="annually"
                  name="frequency"
                  type="radio"
                  className="absolute inset-0 appearance-none rounded-full"
                />
                <span className="text-zinc-500 group-has-checked:text-white dark:text-zinc-400">Annuel</span>
              </label>
            </div>
          </fieldset>
        </div>
        <div className="isolate mx-auto mt-10 grid max-w-md grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              data-featured={tier.featured ? 'true' : undefined}
              className="group/tier rounded-3xl bg-white p-8 ring-1 ring-zinc-200 data-featured:shadow-sm data-featured:ring-2 data-featured:ring-accent-500 xl:p-10 dark:bg-zinc-800/50 dark:ring-white/10 dark:data-featured:ring-2 dark:data-featured:ring-accent-500"
            >
              <h3
                id={`tier-${tier.id}`}
                className="text-lg/8 font-semibold text-zinc-950 dark:text-white dark:group-data-featured/tier:text-accent-400"
              >
                {tier.name}
              </h3>
              <p className="mt-4 text-sm/6 text-zinc-600 dark:text-zinc-300">{tier.description}</p>
              {typeof tier.price === 'string' ? (
                <p className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white">{tier.price}</p>
              ) : (
                <>
                  <p className="mt-6 flex items-baseline gap-x-1 group-not-has-[[name=frequency][value=monthly]:checked]/tiers:hidden">
                    <span className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                      {tier.price.monthly}
                    </span>
                    <span className="text-sm/6 font-semibold text-zinc-600 dark:text-zinc-400">/mois</span>
                  </p>
                  <p className="mt-6 flex items-baseline gap-x-1 group-not-has-[[name=frequency][value=annually]:checked]/tiers:hidden">
                    <span className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                      {tier.price.annually}
                    </span>
                    <span className="text-sm/6 font-semibold text-zinc-600 dark:text-zinc-400">/an</span>
                  </p>
                </>
              )}

              <a
                href={tier.href}
                aria-describedby={`tier-${tier.id}`}
                className="mt-6 block w-full rounded-md bg-accent-600 px-3 py-2 text-center text-sm/6 font-semibold text-white shadow-xs hover:bg-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:bg-accent-500 dark:shadow-none dark:hover:bg-accent-400 dark:focus-visible:outline-accent-500"
              >
                {tier.cta}
              </a>
              <ul role="list" className="mt-8 space-y-3 text-sm/6 text-zinc-600 xl:mt-10 dark:text-zinc-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-x-3">
                    <CheckIcon aria-hidden="true" className="h-6 w-5 flex-none text-accent-600 dark:text-accent-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </form>
  )
}
