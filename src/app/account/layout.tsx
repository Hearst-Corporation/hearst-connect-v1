import { AccountShell } from '@/features/client-portal/shell'
import { loadOverview } from '@/features/client-portal/load'
import { DemoDock } from '@/features/demo/demo-dock'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s · Hearst Connect', default: 'Hearst Connect' },
}

/**
 * L'ESPACE CLIENT — une coque (rail et barre du haut), cinq destinations.
 * Le nom du client vient de sa vue d'ensemble : un compte = un client.
 */
export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireSession()
  const overview = await loadOverview()
  return (
    <>
      <AccountShell user={publicUser(session)} clientName={overview?.client.name ?? null}>
        {children}
      </AccountShell>
      <DemoDock />
    </>
  )
}
