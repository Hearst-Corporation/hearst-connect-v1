'use client'

import { Link } from '@/components/catalyst/link'
import { activeBodyHref, bodySubmenus } from '@/lib/admin-nav'
import { usePathname } from 'next/navigation'

/**
 * Horizontal submenus — rendered only when the active section carries at least
 * two destinations (`bodySubmenus` returns `undefined` otherwise, hence a
 * `null`). The primary destinations stay in the sidebar; the account lives in
 * the user menu.
 *
 * Today only the "Service" section is multi-entry: on `/admin/runtime`,
 * `/admin/api-explorer` and `/admin/keeper`, the toggle renders Service status ↔
 * API explorer ↔ Keeper actions. Single-entry sections (Portfolio,
 * Production) render nothing.
 */
export function AdminBodyNav() {
  const pathname = usePathname()
  const submenus = bodySubmenus(pathname)
  if (submenus === undefined) return null

  const active = activeBodyHref(pathname)

  /* Le sous-menu DÉFILE horizontalement plutôt que de pousser la page. Ses
     entrées sont en `shrink-0` — chacune garde sa largeur, ce qui est voulu :
     un onglet dont le libellé se coupe ne se lit plus. Mais à six entrées
     elles totalisent 720px, et sur un écran de 320px elles poussaient le
     document entier. Le défilement latéral garde les libellés entiers ET la
     page à sa largeur. */
  /* Le sélecteur du bloc vault de /account (`.ud-seg`) : piste sombre,
     destination courante en aplat blanc — le même que les filtres de la
     console. Une rangée de liens nus se lisait comme du texte, pas comme une
     navigation. La piste défile latéralement sur petit écran plutôt que de
     pousser la page. */
  return (
    <nav aria-label="Sub-navigation" className="mb-8 w-full max-w-full overflow-x-auto">
      <div className="ud-seg flex-nowrap!">
        {submenus.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            title={entry.detail}
            aria-current={active === entry.href ? 'page' : undefined}
            className={`ud-seg-btn inline-flex shrink-0 items-center no-underline${active === entry.href ? ' active' : ''}`}
          >
            {entry.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
