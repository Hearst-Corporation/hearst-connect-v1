import { Logo } from '@/components/logo'
import Link from 'next/link'

/** En-tête vitrine — sticky, translucide + blur sur bg-console-app, filet bas. Double action. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-console-line-soft bg-console-app/70 backdrop-blur-xl">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
      >
        <Link href="/" className="-m-1.5 p-1.5 text-white">
          <span className="sr-only">Hearst Connect — accueil</span>
          <Logo />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/register"
            className="hidden text-sm/6 font-semibold text-white/60 transition-colors hover:text-white sm:block"
          >
            Demander un accès
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-accent-400 px-3.5 py-2 text-sm font-semibold text-accent-ink shadow-xs transition-colors hover:bg-accent-300"
          >
            Se connecter
          </Link>
        </div>
      </nav>
    </header>
  )
}
