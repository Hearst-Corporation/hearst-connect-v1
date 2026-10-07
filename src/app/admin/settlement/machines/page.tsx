import type { Metadata } from 'next'
import { renderSettlement } from '../settlement-view'

export const metadata: Metadata = { title: 'Settlement' }
export const dynamic = 'force-dynamic'

/* Le règlement du mois, avec tout le parc de machines (pas seulement celles hors ligne). */
export default function SettlementMachinesPage() {
  return renderSettlement(true)
}
