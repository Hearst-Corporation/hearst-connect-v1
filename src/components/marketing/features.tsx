// Bloc officiel Tailwind Plus — Marketing / Feature Sections
// « Simple three column with large icons » (feature-sections/06), palette du projet.

import { ArrowsRightLeftIcon, ClipboardDocumentListIcon, UsersIcon } from '@heroicons/react/24/outline'

const features = [
  {
    name: 'Une identité, tous les espaces',
    description:
      'Vos collaborateurs se connectent une fois et retrouvent chaque espace de travail auquel ils ont droit. Les départs se répercutent partout, immédiatement.',
    icon: UsersIcon,
  },
  {
    name: 'Connecteurs prêts à brancher',
    description:
      'Okta, Google Workspace, SCIM v2 : l’annuaire existant reste la source de vérité. Aucun double référentiel à maintenir.',
    icon: ArrowsRightLeftIcon,
  },
  {
    name: 'Journal d’accès exportable',
    description:
      'Qui a ouvert quoi, depuis où, avec quel canal. L’historique se filtre, s’exporte et se conserve pour vos audits.',
    icon: ClipboardDocumentListIcon,
  },
]

export function Features() {
  return (
    <div id="produit" className="scroll-mt-16 bg-white py-24 sm:py-32 dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-4xl font-semibold tracking-tight text-pretty text-zinc-950 sm:text-5xl dark:text-white">
            Le poste de contrôle de vos accès
          </h2>
          <p className="mt-6 text-lg/8 text-zinc-600 dark:text-zinc-300">
            Trois choses à faire tourner sans y penser : qui entre, par où, et ce qu’il en reste dans le journal.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="text-base/7 font-semibold text-zinc-950 dark:text-white">
                  <div className="mb-6 flex size-10 items-center justify-center rounded-lg bg-accent-600 dark:bg-accent-500">
                    <feature.icon aria-hidden="true" className="size-6 text-white" />
                  </div>
                  {feature.name}
                </dt>
                <dd className="mt-1 flex flex-auto flex-col text-base/7 text-zinc-600 dark:text-zinc-400">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
