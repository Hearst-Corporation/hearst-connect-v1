import { requireSession } from '@/lib/auth'
import { loadClientBook } from '@/lib/clients/book'
import { clientHref } from '@/lib/clients/vaults'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Un vault n'a plus d'écran à lui : il vit sur la fiche de son client, où
 * l'onglet du vault réunit réserve, allocation, rewards et paiements. L'URL
 * reste (liens, favoris, registre du backend) et renvoie sur cette fiche —
 * une seule version de l'écran, jamais deux.
 */
export default async function Page({ params }: Readonly<{ params: Promise<{ vaultId: string }> }>) {
  await requireSession()
  const { vaultId } = await params
  const book = await loadClientBook()
  const entry = book.entries.find((e) => e.vaults.some((v) => v.vaultId === vaultId))
  const vault = entry?.vaults.find((v) => v.vaultId === vaultId)
  redirect(entry ? clientHref(entry.clientId, vault) : '/admin/clients?view=active')
}
