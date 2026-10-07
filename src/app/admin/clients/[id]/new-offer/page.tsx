import { renderNewOffer } from '@/app/admin/offers/new/new-offer'
import { requireSession } from '@/lib/auth'
import { loadClientBook } from '@/lib/clients/book'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'New offer' }
export const dynamic = 'force-dynamic'

/**
 * Une offre pour un client connu (« New tranche », « New version ») :
 * `/admin/clients/cli_2/new-offer`. Le nom, le rang de la tranche et
 * l'allocation du vault le plus récent sont lus ici, pas passés dans l'URL.
 */
export default async function ClientNewOfferPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  await requireSession()
  const { id } = await params
  const entry = (await loadClientBook()).entries.find((e) => e.clientId === id)
  if (entry === undefined) notFound()
  const latest = entry.vaults[entry.vaults.length - 1]
  const a = entry.stage === 'active' ? latest?.allocation : null
  return renderNewOffer({
    clientId: entry.clientId,
    client: entry.name,
    ...(a ? { tranche: entry.vaults.length + 1, allocation: [a.miningBps, a.lendingBps, a.stableBps] as const } : {}),
  })
}
