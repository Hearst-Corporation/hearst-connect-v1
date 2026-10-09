import { NextResponse } from 'next/server'
import { loadAttestations } from '@/features/client-portal/load'
import { contractLink } from '@/lib/chain/client'
import { reserveRegistryAddress } from '@/lib/env'
import { getSession } from '@/lib/session'

/**
 * LA LIGNE ET LA PREUVE D'UN VAULT pour un mois (`?vault=<vaultId>&period=AAAAMM`), en fichier JSON.
 *
 * Le client n'a pas à nous croire sur parole : avec ce fichier, il appelle lui-même
 * `verifyVault(period, line, proof)` sur le registre (explorateur, script, n'importe quel nœud).
 * Seule SA ligne y figure : la preuve Merkle ne révèle rien des autres clients.
 */
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  if ((await getSession()) === null) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = new URL(req.url)
  const vault = url.searchParams.get('vault')
  const period = Number(url.searchParams.get('period'))
  const entry = (await loadAttestations())?.find((a) => a.vaultId === vault && a.period === period) ?? null
  if (entry === null) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const registry = reserveRegistryAddress()
  const body = {
    about:
      'Your vault line for this month and its Merkle proof. Call verifyVault(period, line, proof) on the Hearst reserve registry: it returns true only if the line is part of the published month AND follows the offer rules.',
    network: 'Ethereum Sepolia (chain id 11155111)',
    registry,
    explorer: registry ? contractLink(registry) : null,
    function: 'verifyVault(uint32,(bytes32,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64),bytes32[])',
    period: entry.period,
    line: entry.line,
    proof: entry.proof,
  }
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="hearst-proof-${entry.period}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
