import { Callout } from '@/components/compositions'
import { loadActivity, loadOverview, loadRewards, loadWallets } from '@/features/client-portal/load'
import { reservePoints, scopeToVault } from '@/features/client-portal/scope'
import { loadUserDashboard } from '@/features/user-dashboard/load'
import { UserDashboardView, type VaultTab } from '@/features/user-dashboard/user-dashboard'
import { accountHref, tabSlug } from '@/features/user-dashboard/urls'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

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
  /* L'onglet dans l'URL porte le mot de l'écran (`strategy`, `movements`).
     Les anciens (`compute`, `activity`, `capital`) y mènent encore. */
  const tab: VaultTab =
    wantedTab === 'strategy' || wantedTab === 'compute' || wantedTab === 'capital'
      ? 'compute'
      : wantedTab === 'movements' || wantedTab === 'activity'
        ? 'activity'
        : 'overview'
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

  /* `?vault=2` : le rang du vault chez le client (1 = premier versement), et
     rien quand il n'en a qu'un. Un ancien lien (identifiant on-chain, ancien
     nom d'onglet) est réécrit dans cette forme. */
  const n = Number(wanted)
  const picked = Number.isInteger(n) && n >= 1 && n <= overview.vaults.length ? n - 1 : overview.vaults.findIndex((v) => v.vaultId === wanted)
  const vault =
    overview.vaults[picked] ??
    [...overview.vaults].reverse().find((v) => v.status === 'ACTIVE') ??
    overview.vaults[0]
  const canonical = accountHref(overview.vaults.length > 1 && picked >= 0 ? picked + 1 : undefined, tab)
  const current = accountHref(wanted, wantedTab === undefined ? 'overview' : tab)
  if (canonical !== current || (wantedTab !== undefined && tabSlug(tab) !== wantedTab) || wantedTab === 'overview') redirect(canonical)

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
