import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Profil investisseur — une route, un fait."
        endpointIds={['profile']}
      />
      <EndpointSection endpointId="profile" />
    </div>
  )
}
