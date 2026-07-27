import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'BTC' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="BTC"
        description="Agrégat BTC du backend."
        endpointIds={['btc']}
      />
      <EndpointSection endpointId="btc" />
    </div>
  )
}
