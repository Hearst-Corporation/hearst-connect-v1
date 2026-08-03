// Bloc officiel Tailwind Plus — Marketing / CTA Sections
// « Simple centered with gradient » (cta-sections/05), palette du projet.

import Link from 'next/link'

export function Cta() {
  return (
    <div className="relative isolate overflow-hidden bg-zinc-900 dark:bg-zinc-950">
      <div className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl">
            Reprenez la main sur vos accès
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-zinc-300">
            Ouvrez votre espace, branchez votre annuaire, invitez vos équipes. Le journal démarre à la première
            connexion.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-xs hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Accéder à la console
            </Link>
            <Link href="/register" className="text-sm/6 font-semibold text-white hover:text-zinc-300">
              Demander un accès <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
      <svg
        viewBox="0 0 1024 1024"
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-x-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
      >
        <circle r={512} cx={512} cy={512} fill="url(#hearst-cta-gradient)" fillOpacity="0.7" />
        <defs>
          <radialGradient id="hearst-cta-gradient">
            <stop stopColor="var(--color-accent-500, #63db43)" />
            <stop offset={1} stopColor="var(--color-accent-900, #17370e)" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  )
}
