import { Logo } from '@/components/logo'
import { LOGIN_HREF, REGISTER_HREF } from '@/components/marketing/landing-content'
import Link from 'next/link'

const footerLinks = [
  { title: 'Sign in', href: LOGIN_HREF },
  { title: 'Request access', href: REGISTER_HREF },
  { title: 'Hearst Corporation', href: 'https://hearstcorporation.io' },
  { title: 'Contact us', href: 'mailto:connect@hearstcorporation.io' },
  { title: 'Security', href: 'mailto:security@hearstcorporation.io' },
  { title: 'Privacy', href: 'mailto:connect@hearstcorporation.io' },
  { title: 'Terms', href: 'mailto:connect@hearstcorporation.io' },
] as const

/** Marketing footer — watermark "Connect" background, menus on top. */
export function SiteFooter() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-console-line-soft bg-console-app">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 select-none text-center text-[clamp(4.5rem,18vw,14rem)] leading-none font-bold tracking-tight text-accent-300/[0.08]"
      >
        Connect
      </p>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start justify-between gap-10 px-6 py-10 pb-24 text-sm md:flex-row md:px-8 md:pb-28">
        <div>
          <Link href="/" className="inline-flex text-white">
            <Logo />
          </Link>
          <p className="mt-4 max-w-[14rem] text-sm/6 text-white/60">
            © Hearst Corporation {new Date().getFullYear()}. All rights reserved.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-10 gap-y-3 md:gap-x-16">
            {footerLinks.map((link) => (
              <li key={link.title}>
                <Link href={link.href} className="text-white/60 transition-colors hover:text-white">
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
