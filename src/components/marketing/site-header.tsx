import { Logo } from '@/components/logo'
import Link from 'next/link'

export function SiteHeader() {
  return (
    <header className="bg-console-app">
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        <Link href="/" className="-m-1.5 p-1.5 text-white">
          <span className="sr-only">Hearst Connect</span>
          <Logo />
        </Link>
        <Link href="/login" className="text-sm/6 font-semibold text-white">
          Se connecter
        </Link>
      </nav>
    </header>
  )
}
