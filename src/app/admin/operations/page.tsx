import { redirect } from 'next/navigation'

/**
 * L'ancienne page Operations. La dérive se lit sur le tableau de bord ;
 * l'historique des rééquilibrages, vault par vault, sur la fiche client.
 */
export default function Page() {
  redirect('/admin/clients/active')
}
