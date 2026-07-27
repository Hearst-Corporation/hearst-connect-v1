import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Agrégat investisseur servi par le backend. Le statut d'enveloppe est calculé pire-champ-d'abord : un seul champ dégradé abaisse l'ensemble."
        endpointIds={['dashboard']}
      />
      <EndpointSection endpointId="dashboard" />
    </div>
  )
}
