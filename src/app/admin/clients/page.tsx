import { ClientsPage } from '@/features/admin-clients/clients-page'
import { CLIENT_VIEW_PATH, type View } from '@/features/admin-clients/views'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/* La liste des clients. Ses filtres ont chacun leur adresse : /admin/clients/active,
   /waiting… Un ancien lien `?view=active` y est réécrit. */
export default async function Page({ searchParams }: Readonly<{ searchParams: Promise<{ view?: string }> }>) {
  const { view } = await searchParams
  if (view !== undefined) redirect(CLIENT_VIEW_PATH[view as View] ?? '/admin/clients')
  return <ClientsPage />
}
