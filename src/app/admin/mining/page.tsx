import { redirect } from 'next/navigation'

/**
 * L'ancienne adresse de la page de minage. La page est devenue « Settlement »
 * (le règlement du mois : rewards à valider, électricité à payer, vault par
 * vault) ; les liens et favoris existants y mènent toujours.
 */
export default async function MiningRedirect({
  searchParams,
}: Readonly<{ searchParams: Promise<{ readonly machines?: string }> }>) {
  const { machines } = await searchParams
  redirect(machines === 'all' ? '/admin/settlement/machines' : '/admin/settlement')
}
