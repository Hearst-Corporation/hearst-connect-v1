import type { Metadata } from 'next'
import { ClientSimulatorDetailView } from './detail-view'

export const metadata: Metadata = { title: 'Client' }
export const dynamic = 'force-dynamic'

type PageProps = Readonly<{ params: Promise<{ id: string }> }>

/**
 * Admin client 360 — thin server wrapper.
 * Data reading and rendering live in `detail-view.tsx`.
 */
export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <ClientSimulatorDetailView id={id} />
}
