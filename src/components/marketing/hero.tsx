// Bloc officiel Tailwind Plus — Marketing / Heroes
// « Simple centered » (heroes/01), header extrait dans le layout, palette du projet.

import Link from 'next/link'

const CLIP_PATH =
  'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)'

export function Hero() {
  return (
    <div className="relative isolate overflow-hidden bg-white px-6 lg:px-8 dark:bg-zinc-900">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{ clipPath: CLIP_PATH }}
          className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-[#93c5fd] to-[#2563eb] opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
        />
      </div>

      <div className="mx-auto max-w-2xl py-24 sm:py-32 lg:py-40">
        <div className="hidden sm:mb-8 sm:flex sm:justify-center">
          <div className="relative rounded-full px-3 py-1 text-sm/6 text-zinc-600 ring-1 ring-zinc-900/10 hover:ring-zinc-900/20 dark:text-zinc-400 dark:ring-white/10 dark:hover:ring-white/20">
            Journal d’audit temps réel sur tous les espaces.{' '}
            <a href="#securite" className="font-semibold text-accent-600 dark:text-accent-400">
              <span aria-hidden="true" className="absolute inset-0" />
              En savoir plus <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-7xl dark:text-white">
            Un seul accès à toute la Corporation
          </h1>
          <p className="mt-8 text-lg font-medium text-pretty text-zinc-500 sm:text-xl/8 dark:text-zinc-400">
            Hearst Connect fédère les identités, les autorisations et les journaux d’accès de vos espaces de travail.
            Vos équipes se connectent une fois ; vous gardez la trace de tout, au même endroit.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-md bg-accent-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-accent-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:bg-accent-500 dark:hover:bg-accent-400 dark:focus-visible:outline-accent-500"
            >
              Accéder à la console
            </Link>
            <a href="#produit" className="text-sm/6 font-semibold text-zinc-900 dark:text-white">
              Voir le produit <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
      >
        <div
          style={{ clipPath: CLIP_PATH }}
          className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-[#93c5fd] to-[#2563eb] opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
        />
      </div>
    </div>
  )
}
