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
 * L'adresse d'une fiche client, en chemin : `/admin/clients/cli_2/vault-2/rewards`.
 * Le vault par son rang de tranche, jamais l'identifiant on-chain ; ni `?` ni
 * `=`. La fiche réécrit les anciens liens (`?vault=…&tab=…`) dans cette forme.
 */
export function clientHref(clientId: string, vault?: Pick<AdminVaultRecord, 'tranche'> | null, tab?: string): string {
  return `/admin/clients/${encodeURIComponent(clientId)}${vault ? `/vault-${vault.tranche ?? 1}` : ''}${tab ? `/${tab}` : ''}`
}

/** Lit la fin d'une adresse de fiche : `vault-2/rewards`, `rewards`, `vault-2` ou rien. */
export function parseClientPath(slug: readonly string[] | undefined): { vault?: string; tab?: string } {
  const [first, second] = slug ?? []
  const m = first?.match(/^vault-(\d+)$/)
  return m ? { vault: m[1], tab: second } : { tab: first }
}
