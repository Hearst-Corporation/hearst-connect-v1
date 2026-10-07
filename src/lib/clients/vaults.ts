import type { AdminVaultRecord } from '@/lib/admin-dashboard/contracts'

/**
 * UN CLIENT, N VAULTS — un par tranche.
 *
 * Un nouveau versement n'est jamais ajouté à un vault existant : il ouvre son
 * propre vault, avec son prix d'entrée en bitcoin, son blocage et son
 * allocation. Les fusionner mélangerait les prix d'entrée (« Ahead of simply
 * holding » ne voudrait plus rien dire), les échéances, et ferait sortir le
 * vault de sa bande à chaque dépôt.
 *
 * La console lit donc un client comme la somme de ses vaults, et chaque vault
 * comme une tranche.
 */

/** Le rang de la tranche : 1 pour le premier versement. */
export const trancheOf = (v: AdminVaultRecord): number => v.tranche ?? 1

/** Les vaults d'un client, du premier versement au plus récent. */
export function clientVaults(rows: readonly AdminVaultRecord[], clientId: string): readonly AdminVaultRecord[] {
  return rows
    .filter((v) => v.clientId === clientId)
    .sort(
      (a, b) =>
        trancheOf(a) - trancheOf(b) ||
        Date.parse(a.lockupStartAt ?? '') - Date.parse(b.lockupStartAt ?? ''),
    )
}

/**
 * Le nom d'un vault dans une liste qui mêle plusieurs clients : le client seul
 * quand il n'a qu'un vault, « client · Tranche n » quand il en a plusieurs —
 * deux lignes « ZAND Bank » ne se distingueraient pas.
 */
export function vaultDisplayName(v: AdminVaultRecord, all: readonly AdminVaultRecord[]): string {
  const siblings = all.filter((x) => x.clientId === v.clientId).length
  return siblings > 1 ? `${v.clientLabel} · Vault ${trancheOf(v)}` : v.clientLabel
}

/** La réserve d'un vault, en sats : le versement converti à l'entrée, plus l'accumulé. */
export const reserveSats = (v: AdminVaultRecord): number => (v.capitalBtcSats ?? 0) + (v.accruedBtcSats ?? 0)

/**
 * L'adresse d'une fiche client : `?vault=2` (le rang de la tranche), jamais
 * l'identifiant on-chain — `31337-0x1111…` dans la barre d'adresse ne dit rien
 * à personne. La fiche redirige les anciens liens vers cette forme.
 */
export function clientHref(clientId: string, vault?: Pick<AdminVaultRecord, 'tranche'> | null, tab?: string): string {
  const q = [vault ? `vault=${vault.tranche ?? 1}` : null, tab ? `tab=${tab}` : null].filter(Boolean).join('&')
  return `/admin/clients/${encodeURIComponent(clientId)}${q ? `?${q}` : ''}`
}
