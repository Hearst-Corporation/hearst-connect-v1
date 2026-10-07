import { redirect } from 'next/navigation'

/**
 * L'ancienne page Decisions. La file vit sur le tableau de bord, dans
 * « Waiting on you » : le résumé par type, et la liste avec ses boutons.
 */
export default function Page() {
  redirect('/admin#decisions')
}
