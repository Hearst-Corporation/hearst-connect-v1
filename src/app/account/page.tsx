import { Callout } from '@/components/compositions'
import { loadActivity, loadOverview, loadRewards, loadWallets } from '@/features/client-portal/load'
import { reservePoints, scopeToVault } from '@/features/client-portal/scope'
import { loadUserDashboard } from '@/features/user-dashboard/load'
import { UserDashboardView, type VaultTab } from '@/features/user-dashboard/user-dashboard'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My vault' }
export const dynamic = 'force-dynamic'

/**
 * MY VAULT — l'écran du client. Le contexte commun (marché, réseau, parc) vient
 * de `loadUserDashboard` ; tout ce qui est À LUI vient du livre de ses vaults,
 * le même que lit l'admin. `?vault=` choisit le vault quand il en a plusieurs.
 */
export default async function AccountPage({ searchParams }: Readonly<{ searchParams: Promise<{ vault?: string; tab?: string }> }>) {
  await requireSession()
  const { vault: wanted, tab: wantedTab } = await searchParams
  const TABS: readonly VaultTab[] = ['overview', 'compute', 'activity']
  // L'ancien onglet « Capital & lockup » est réparti : la stratégie dans
  // Strategy & mining, la fin de blocage sur l'Overview.
  const tab = wantedTab === 'capital' ? 'compute' : (TABS.find((t) => t === wantedTab) ?? 'overview')
  const [data, overview, rewards, activity, wallets] = await Promise.all([
    loadUserDashboard(),
    loadOverview(),
    loadRewards(),
    loadActivity(),
    loadWallets(),
  ])

  if (overview === null || overview.vaults.length === 0) {
    return (
      <Callout tone="warning" title="Your position could not be read">
        Nothing is shown rather than a guess. Your relationship manager can help in the meantime.
      </Callout>
    )
  }

  const vault =
    overview.vaults.find((v) => v.vaultId === wanted) ??
    [...overview.vaults].reverse().find((v) => v.status === 'ACTIVE') ??
    overview.vaults[0]

  return (
    <UserDashboardView
      tab={tab}
      data={scopeToVault(data, vault)}
      overview={overview}
      vault={vault}
      rewards={(rewards ?? []).filter((r) => r.vaultId === vault.vaultId)}
      activity={activity}
      wallets={wallets ?? []}
      reserve={reservePoints(overview.vaults, rewards ?? [])}
    />
  )
}
