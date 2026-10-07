import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { renderSettlement } from './settlement-view'

export const metadata: Metadata = { title: 'Settlement' }
export const dynamic = 'force-dynamic'

/* Le règlement du mois. Tout le parc a sa propre adresse : /admin/settlement/machines. */
export default async function SettlementPage({ searchParams }: Readonly<{ searchParams: Promise<{ readonly machines?: string }> }>) {
  if ((await searchParams).machines === 'all') redirect('/admin/settlement/machines')
  return renderSettlement(false)
}
