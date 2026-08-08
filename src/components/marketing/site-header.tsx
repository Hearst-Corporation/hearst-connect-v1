import { Logo } from '@/components/logo'
import { REGISTER_HREF } from '@/components/marketing/landing-content'
import { MarketingSignInLink } from '@/components/marketing/marketing-cta'
import Link from 'next/link'

/** Marketing header — sticky, translucent blur on bg-console-app, bottom rule. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-console-line-soft bg-console-app/70 backdrop-blur-xl">
      <nav
        aria-label="Global"
        className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
      >
        <Link href="/" className="-m-1.5 p-1.5 text-white">
          <span className="sr-only">Hearst Connect — home</span>
          <Logo />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href={REGISTER_HREF}
            className="hidden text-sm/6 font-semibold text-white/60 transition-colors hover:text-white sm:inline"
          >
            Request access
          </Link>
          <MarketingSignInLink />
        </div>
      </nav>
    </header>
  )
}
