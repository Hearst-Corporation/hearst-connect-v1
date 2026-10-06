import { AdminApplicationLayout } from '@/components/admin/application-layout'
import { TableLabels } from '@/components/admin/table-labels'
import { requireSession } from '@/lib/auth'
import { loadAdminInbox } from '@/lib/notifications/inbox'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

/**
 * Le design de /account, appliqué à la console.
 *
 * Les deux surfaces vivaient sur deux systèmes distincts : /account porte son
 * propre fichier CSS — 476 règles réglées au pixel, toutes enfermées sous
 * `.ud-root` — tandis que la console s'habillait de Catalyst et de classes
 * Tailwind. Rapprocher les deux valeur par valeur ne finissait jamais : il en
 * restait toujours une.
 *
 * On importe donc le MÊME fichier et on pose sa classe racine sur la console.
 * Les cartes, les titres, les tuiles, les tableaux et les tokens de couleur
 * s'appliquent alors tels quels, et une retouche faite sur /account se
 * répercute ici sans rien recopier.
 *
 * Le fichier n'est pas modifié : il est réutilisé. /account garde donc
 * exactement le rendu qu'il avait.
 */
import '@/features/user-dashboard/user-dashboard.css'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect Administration', default: 'Hearst Connect Administration' },
}

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  // La boîte de réception de la cloche : lue ici une fois, puis rafraîchie
  // par la cloche elle-même (la mise en page ne se recalcule pas à chaque page).
  const inbox = await loadAdminInbox().catch(() => [])
  return (
    <div className="ud-root ud-admin">
      <AdminApplicationLayout user={publicUser(session)} inbox={inbox}>
        {children}
      </AdminApplicationLayout>
      <TableLabels />
    </div>
  )
}
