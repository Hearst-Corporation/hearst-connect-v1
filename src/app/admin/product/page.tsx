import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product"
        description="Fiche produit et conditions contractuelles."
        endpointIds={['product-factsheet']}
      />
      <EndpointSection endpointId="product-factsheet" />
    </div>
  )
}
