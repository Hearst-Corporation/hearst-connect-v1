import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Runtime' }
export const dynamic = 'force-dynamic'

export default function RuntimePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Runtime"
        description="Sondes opérationnelles publiques. Les valeurs inconnues restent inconnues : une absence de contrat, de chaîne ou d’indexeur s’affiche telle quelle, jamais comme un zéro."
        endpointIds={['health', 'ready', 'runtime']}
      />
      <EndpointSection endpointId="runtime" title="Mode de contrat, chaîne, retard d’indexeur" />
      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointSection endpointId="health" title="/health" />
        <EndpointSection endpointId="ready" title="/ready" />
      </div>
    </div>
  )
}
