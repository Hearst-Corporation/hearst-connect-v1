import { redirect } from 'next/navigation'

/* Les vaults vivent dans « My Vault » (sélecteur en tête du vault) : une seule
   page par vault, plus deux qui se répétaient. Les anciens liens y mènent. */
export default async function VaultsPage({ searchParams }: Readonly<{ searchParams: Promise<{ vault?: string }> }>) {
  const { vault } = await searchParams
  redirect(vault ? `/account?vault=${encodeURIComponent(vault)}` : '/account')
}
