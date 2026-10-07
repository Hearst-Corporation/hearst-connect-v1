import type { Metadata } from 'next'
import { renderNewOffer } from './new-offer'

export const metadata: Metadata = { title: 'New offer' }
export const dynamic = 'force-dynamic'

/**
 * Créer une offre — l'entrée du parcours commercial.
 *
 * Après l'appel avec le client vient la proposition : à qui, combien, sur
 * quelle allocation, pour combien de temps. L'offre naît en brouillon ; rien
 * ne part tant que personne ne l'envoie.
 */
export default async function NewOfferPage() {
  return renderNewOffer()
}
