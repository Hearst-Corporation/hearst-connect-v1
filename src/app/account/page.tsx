import { Callout } from '@/components/compositions'
import { loadActivity, loadAttestations, loadOverview, loadRewards, loadWallets } from '@/features/client-portal/load'
import { reservePoints, scopeToVault, withChainLedgers, withChainSpot } from '@/features/client-portal/scope'
import { readVaultLedgers } from '@/lib/chain/reserve-registry'
import { loadUserDashboard } from '@/features/user-dashboard/load'
import { UserDashboardView, type VaultTab } from '@/features/user-dashboard/user-dashboard'
import { accountHref, parseAccountPath, tabOf } from '@/features/user-dashboard/urls'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'My vault' }
export const dynamic = 'force-dynamic'

/**
 * MY VAULT — l'écran du client. Le contexte commun (marché, réseau, parc) vient
 * de `loadUserDashboard` ; tout ce qui est À LUI vient du livre de ses vaults,
 * le même que lit l'admin. `/account/vault-2` choisit le vault quand il en a plusieurs.
 */
export default async function AccountPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ slug?: string[] }>; searchParams: Promise<{ vault?: string; tab?: string }> }>) {
  await requireSession()
  /* Le vault et l'onglet sont dans le chemin : `/account/vault-2/mining`.
     Les anciennes adresses (`?vault=…&tab=…`) sont lues puis réécrites. */
  const { slug } = await params
  const path = parseAccountPath(slug)
  const legacy = await searchParams
  const wanted = legacy.vault ?? path.vault
  const wantedTab = legacy.tab ?? path.tab
  const tab = tabOf(wantedTab)
  const [data, book, bookRewards, activity, wallets, ledgers] = await Promise.all([
    loadUserDashboard(),
    loadOverview(),
    loadRewards(),
    loadActivity(),
    loadWallets(),
    // Les lignes de ses vaults, vérifiées une à une par HearstReserveRegistry.
    loadAttestations().then(readVaultLedgers),
  ])
  /* Les chiffres de ses vaults viennent du registre on-chain, le cours du
     bitcoin de l'oracle — comme le bloc Mining Economics. */
  const chained = book === null ? null : withChainLedgers(withChainSpot(book, data.productionCost), bookRewards ?? [], ledgers)
  const overview = chained?.overview ?? null
  const rewards = chained?.rewards ?? null

  if (overview === null || overview.vaults.length === 0) {
    return (
      <Callout tone="warning" title="Your position could not be read">
        Nothing is shown rather than a guess. Your relationship manager can help in the meantime.
      </Callout>
    )
  }

  /* `vault-2` : le rang du vault chez le client (1 = premier versement), et
     rien quand il n'en a qu'un. Un ancien lien (identifiant on-chain, ancien
     nom d'onglet) est réécrit dans cette forme. */
  const n = Number(wanted)
  const picked = Number.isInteger(n) && n >= 1 && n <= overview.vaults.length ? n - 1 : overview.vaults.findIndex((v) => v.vaultId === wanted)
  const vault =
    overview.vaults[picked] ??
    [...overview.vaults].reverse().find((v) => v.status === 'ACTIVE') ??
    overview.vaults[0]
  const canonical = accountHref(overview.vaults.length > 1 && picked >= 0 ? picked + 1 : undefined, tab)
  const current = `/account${slug?.length ? `/${slug.join('/')}` : ''}`
  if (legacy.vault !== undefined || legacy.tab !== undefined || canonical !== current) redirect(canonical)

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
