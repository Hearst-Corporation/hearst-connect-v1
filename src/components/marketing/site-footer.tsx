// Bloc officiel Tailwind Plus — Marketing / Footers
// « 4 column simple » (footers/03), palette du projet.

import { Logo } from '@/components/logo'
import Link from 'next/link'

const navigation = {
  produit: [
    { name: 'Fonctionnalités', href: '#produit' },
    { name: 'Sécurité', href: '#securite' },
    { name: 'Tarifs', href: '#tarifs' },
    { name: 'Console', href: '/login' },
  ],
  ressources: [
    { name: 'Questions fréquentes', href: '#questions' },
    { name: 'Nous écrire', href: 'mailto:connect@hearstcorporation.io' },
  ],
  entreprise: [{ name: 'Hearst Corporation', href: 'https://hearstcorporation.io' }],
  contact: [
    { name: 'Support', href: 'mailto:connect@hearstcorporation.io' },
    { name: 'Sécurité', href: 'mailto:security@hearstcorporation.io' },
  ],
}

function Column({ title, items }: Readonly<{ title: string; items: { name: string; href: string }[] }>) {
  return (
    <div>
      <h3 className="text-sm/6 font-semibold text-zinc-950 dark:text-white">{title}</h3>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className="text-sm/6 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="bg-white dark:bg-zinc-900">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-8 lg:py-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="text-zinc-950 dark:text-white">
            <Logo />
            <p className="mt-6 max-w-xs text-sm/6 text-zinc-600 dark:text-zinc-400">
              L’accès unifié aux espaces de travail de Hearst Corporation.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <Column title="Produit" items={navigation.produit} />
              <div className="mt-10 md:mt-0">
                <Column title="Ressources" items={navigation.ressources} />
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <Column title="Entreprise" items={navigation.entreprise} />
              <div className="mt-10 md:mt-0">
                <Column title="Contact" items={navigation.contact} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-16 border-t border-zinc-900/10 pt-8 sm:mt-20 lg:mt-24 dark:border-white/10">
          <p className="text-sm/6 text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} Hearst Corporation. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}
