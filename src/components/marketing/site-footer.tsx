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

const register = [
  { title: 'Créer un compte', href: '/register' },
  { title: 'Se connecter', href: '/login' },
]

/** Footer Aceternity « four grids » — watermark « Connect » en accent Hearst. */
export function SiteFooter() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-console-line bg-console-app">
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-6 py-10 text-sm md:flex-row md:px-8">
        <div>
          <Link href="/" className="inline-flex text-white">
            <Logo />
          </Link>
          <p className="mt-4 max-w-[14rem] text-sm/6 text-white/40">
            © copyright Hearst Corporation {new Date().getFullYear()}. Tous droits réservés.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-16">
          <FooterColumn title="Pages" links={pages} />
          <FooterColumn title="Contact" links={socials} />
          <FooterColumn title="Légal" links={legal} />
          <FooterColumn title="Compte" links={register} />
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none relative z-0 select-none px-4 pb-2 text-center text-[5.5rem] leading-none font-bold tracking-tight text-accent-300/15 sm:text-[8rem] md:text-[11rem] lg:text-[13rem]"
      >
        Connect
      </p>
    </footer>
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
    <div className="flex flex-col space-y-4">
      <p className="font-bold text-white">{title}</p>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.title}>
            <Link href={link.href} className="text-white/40 transition-colors hover:text-white">
              {link.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
