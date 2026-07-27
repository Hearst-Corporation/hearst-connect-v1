import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mining' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mining"
        description="Agrégat minage, métriques on-chain et poste électricité. Trois routes distinctes, jamais fusionnées en un chiffre unique côté frontend."
        endpointIds={['mining', 'mining-onchain', 'mining-electricity']}
      />
      <EndpointSection endpointId="mining" />
      <EndpointSection endpointId="mining-onchain" />
      <EndpointSection endpointId="mining-electricity" />
    </div>
  )
}
