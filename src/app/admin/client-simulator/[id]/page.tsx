import type { Metadata } from 'next'
import { ClientSimulatorDetailView } from './detail-view'

export const metadata: Metadata = { title: 'Simulated client' }
export const dynamic = 'force-dynamic'

type PageProps = Readonly<{ params: Promise<{ id: string }> }>

/**
 * Simulated client detail — thin server wrapper.
 * Data reading and rendering live in `detail-view.tsx`.
 */
export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <ClientSimulatorDetailView id={id} />
}
