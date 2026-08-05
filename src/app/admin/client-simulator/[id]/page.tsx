import type { Metadata } from 'next'
import { ClientSimulatorDetailView } from './detail-view'

export const metadata: Metadata = { title: 'Client simulé' }
export const dynamic = 'force-dynamic'

type PageProps = Readonly<{ params: Promise<{ id: string }> }>

/**
 * Détail client simulé — enveloppe serveur mince.
 * La lecture et l’affichage vivent dans `detail-view.tsx`.
 */
export default async function Page({ params }: PageProps) {
  const { id } = await params
  return <ClientSimulatorDetailView id={id} />
}
