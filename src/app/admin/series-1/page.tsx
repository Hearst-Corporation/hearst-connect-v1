import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Series 1' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Series 1"
        description="Événements indexés de la Series 1, tels que renvoyés par le backend."
        endpointIds={['series1-events']}
      />
      <EndpointSection endpointId="series1-events" />
    </div>
  )
}
