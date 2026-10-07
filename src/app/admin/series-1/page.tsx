import { redirect } from 'next/navigation'

/**
 * L'ancien journal « Series 1 » — les événements indexés du premier produit.
 * Les mouvements d'argent se lisent désormais dans les transactions Fireblocks
 * (fiche client) ; la santé de l'indexeur, dans Service.
 */
export default function Page() {
  redirect('/admin/settings/developer/service')
}
