import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Backtest' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Backtest"
        description="Séries historiques calculées par le backend. Le frontend n'en dérive aucune projection ni extrapolation."
        endpointIds={['backtest-historical']}
      />
      <EndpointSection endpointId="backtest-historical" />
    </div>
  )
}
