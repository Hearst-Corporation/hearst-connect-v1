import { redirect } from 'next/navigation'

/**
 * L'ancienne page Compliance. Le KYC se lit dans Clients (colonne et compteur)
 * et, KYC + AML, sur chaque fiche client : la décision appartient à Sumsub.
 */
export default function Page() {
  redirect('/admin/clients')
}
