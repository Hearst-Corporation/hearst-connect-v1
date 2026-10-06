'use client'

import { surfaceNav } from '@/components/admin/surface'
import clsx from 'clsx'
import type React from 'react'

/**
 * Le rail latéral à partir de 768px ; en dessous, la barre mobile fournie par
 * l'appelant (`mobileBar`) — le même seuil que /account, dont la console
 * reprend la barre et le burger. L'ancien tiroir Catalyst recopiait le rail
 * desktop dans un panneau quasi transparent : le contenu se lisait au travers.
 */
export function SidebarLayout({
  mobileBar,
  sidebar,
  children,
}: React.PropsWithChildren<{ mobileBar: React.ReactNode; sidebar: React.ReactNode }>) {
  return (
    <div className="relative isolate flex min-h-svh w-full max-md:flex-col">
      {/* Plus de couche de halo (passe UI 2026-09) : les surfaces sont opaques,
          le glow ne teintait plus que les marges et délavait la hiérarchie. */}

      {/* Sidebar — z au-dessus du main (sinon le padding lg:pl-64 du main
          capture les clics et la nav est morte). */}
      <div className={clsx('fixed inset-y-0 left-0 z-30 w-[169px] max-md:hidden', surfaceNav)}>
        {sidebar}
      </div>

      {mobileBar}

      {/* Contenu — sous le rail en z-index ; le retrait gauche réserve sa
          place. Plus de marge autour : /account colle sa zone de contenu au
          bord, ce qui permet au filet sous la marque de traverser l'écran
          d'un seul trait. Avec une marge, il s'arrêtait au rail. */}
      <main className="relative z-10 flex flex-1 flex-col md:min-w-0 md:pl-[169px]">
        {/* Le conteneur de page ne peint RIEN d'autre que le fond de page
            (`--ud-page`), sur lequel les cartes se détachent. */}
        <div className="grow bg-[var(--ud-page)] px-[var(--ud-pad-page)] pb-6 max-md:pt-6">
          <div className="w-full min-w-0">{children}</div>
        </div>
      </main>
    </div>
  )
}
