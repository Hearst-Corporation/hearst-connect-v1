import { NextResponse } from 'next/server'
import { readMiningEconomics } from '@/lib/chain/mining-oracle'
import { getSession } from '@/lib/session'

/**
 * Mining Economics en direct : `HearstMiningOracle.economics()` relu à la demande.
 *
 * Le bloc de l'espace client l'appelle toutes les 20 secondes pour que le cours (Chainlink) et la marge
 * bougent à l'écran sans recharger la page. Une lecture de contrat ne coûte aucun gaz.
 * Sous `/account` : la landing connect.hearst.app ne relaie à l'application que ces chemins-là.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  if ((await getSession()) === null) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await readMiningEconomics(), { headers: { 'Cache-Control': 'no-store' } })
}
