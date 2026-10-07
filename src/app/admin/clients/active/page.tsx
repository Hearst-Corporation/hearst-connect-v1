import { ClientsPage } from '@/features/admin-clients/clients-page'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/* La liste des clients, filtrée : /admin/clients/active. */
export default function Page() {
  return <ClientsPage view="active" />
}
