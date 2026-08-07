import { Logo } from '@/components/logo'
import Link from 'next/link'

const pages = [
  { title: 'Console', href: '/login' },
  { title: 'Demander un accès', href: '/register' },
  { title: 'Hearst Corporation', href: 'https://hearstcorporation.io' },
]

const socials = [
  { title: 'Nous écrire', href: 'mailto:connect@hearstcorporation.io' },
  { title: 'Sécurité', href: 'mailto:security@hearstcorporation.io' },
]

const legal = [
  { title: 'Confidentialité', href: 'mailto:connect@hearstcorporation.io' },
  { title: 'Conditions', href: 'mailto:connect@hearstcorporation.io' },
]

const account = [
  { title: 'Créer un compte', href: '/register' },
  { title: 'Se connecter', href: '/login' },
]

export function FooterWithFourGrids() {
  return (
    <div className="relative w-full overflow-hidden border-t border-console-line bg-console-app">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-6 py-12 text-sm md:flex-row md:px-8">
        <div>
          <Link href="/" className="inline-flex text-white">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm/6 text-white/50">
            L’accès unifié aux espaces de travail de Hearst Corporation.
          </p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-10 md:mt-0 md:grid-cols-4 md:gap-16">
          <FooterColumn title="Pages" links={pages} />
          <FooterColumn title="Contact" links={socials} />
          <FooterColumn title="Légal" links={legal} />
          <FooterColumn title="Compte" links={account} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl border-t border-console-line px-6 py-6 md:px-8">
        <p className="text-sm text-white/40">
          © {new Date().getFullYear()} Hearst Corporation. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}

function FooterColumn({
  title,
  links,
}: Readonly<{
  title: string
  links: ReadonlyArray<{ title: string; href: string }>
}>) {
  return (
    <div className="flex flex-col space-y-3">
      <p className="font-semibold text-white">{title}</p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.title}>
            <Link
              href={link.href}
              className="text-white/50 transition-colors hover:text-white"
            >
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Footer marketing — layout Aceternity « four grids », tokens Hearst. */
export function SiteFooter() {
  return (
    <footer>
      <FooterWithFourGrids />
    </footer>
  )
}
