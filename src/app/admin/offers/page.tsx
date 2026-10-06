import { redirect } from 'next/navigation'

/**
 * L'ancienne page Offers. Une offre appartient à un client : la liste des
 * offres en cours est le filtre « Pipeline » de Clients, et chaque offre
 * s'ouvre sur la fiche de son client.
 */
export default function Page() {
  redirect('/admin/clients?view=pipeline')
}
