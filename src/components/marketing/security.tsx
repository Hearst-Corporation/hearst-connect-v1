// Bloc officiel Tailwind Plus — Marketing / Feature Sections
// « Simple three column with small icons » (feature-sections/04), palette du projet.

import { ArrowPathIcon, FingerPrintIcon, LockClosedIcon } from '@heroicons/react/20/solid'

const features = [
  {
    name: 'Sessions signées',
    description:
      'Chaque session est un jeton signé côté serveur, à durée limitée, posé en cookie httpOnly. Rien d’exploitable n’atterrit dans le navigateur.',
    icon: LockClosedIcon,
  },
  {
    name: 'Second facteur imposable',
    description:
      'Le second facteur s’impose par espace ou par rôle. Les comptes propriétaires peuvent le rendre obligatoire pour toute l’organisation.',
    icon: FingerPrintIcon,
  },
  {
    name: 'Rotation des clés',
    description:
      'Les clés d’API se renouvellent sans interruption de service, avec période de recouvrement et révocation immédiate en cas de doute.',
    icon: ArrowPathIcon,
  },
]

export function Security() {
  return (
    <div id="securite" className="scroll-mt-16 bg-zinc-50 py-24 sm:py-32 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h2 className="text-base/7 font-semibold text-accent-600 dark:text-accent-400">Sécurité</h2>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-zinc-950 sm:text-5xl lg:text-balance dark:text-white">
            Fermé par défaut, ouvert à la demande
          </p>
          <p className="mt-6 text-lg/8 text-zinc-600 dark:text-zinc-300">
            Un accès se donne, se date et se retire. Ce qui n’a pas été accordé explicitement n’existe pas.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base/7 font-semibold text-zinc-950 dark:text-white">
                  <feature.icon aria-hidden="true" className="size-5 flex-none text-accent-600 dark:text-accent-400" />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base/7 text-zinc-600 dark:text-zinc-400">
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
