import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-console-app px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-accent-400">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-white sm:text-7xl">
          Page introuvable
        </h1>
        <p className="mt-6 text-lg font-medium text-pretty text-white/50 sm:text-xl/8">
          Cette adresse ne correspond à aucune page de Hearst Connect.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/"
            className="rounded-md bg-accent-400 px-3.5 py-2.5 text-sm font-semibold text-accent-ink shadow-xs hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            Retour à l’accueil
          </Link>
          <Link href="/login" className="text-sm/6 font-semibold text-white">
            Accéder à la console <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  )
}
