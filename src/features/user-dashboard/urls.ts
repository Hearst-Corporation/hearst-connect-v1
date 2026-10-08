import type { VaultTab } from './user-dashboard'

/** Le mot de l'onglet dans l'adresse : celui que le client lit à l'écran. */
const SLUG: Record<VaultTab, string> = { overview: 'overview', compute: 'mining', activity: 'movements' }

export const tabSlug = (tab: VaultTab): string => SLUG[tab]

/** L'onglet d'un mot d'adresse ; les anciens noms (`compute`, `activity`, `capital`) y mènent encore. */
export function tabOf(word: string | undefined): VaultTab {
  if (word === 'mining' || word === 'strategy' || word === 'compute' || word === 'capital') return 'compute'
  if (word === 'movements' || word === 'activity') return 'activity'
  return 'overview'
}

/**
 * L'adresse de My Vault, en chemin : `/account/vault-2/mining`. Le vault par
 * son rang chez le client, jamais `31337-0x1111…` ; ni `?` ni `=` ; l'Overview
 * sans mot.
 */
export function accountHref(vault: number | string | undefined, tab: VaultTab = 'overview'): string {
  return `/account${vault !== undefined && vault !== '' ? `/vault-${vault}` : ''}${tab !== 'overview' ? `/${SLUG[tab]}` : ''}`
}

/** Lit la fin d'une adresse de My Vault : `vault-2/mining`, `mining`, `vault-2` ou rien. */
export function parseAccountPath(slug: readonly string[] | undefined): { vault?: string; tab?: string } {
  const [first, second] = slug ?? []
  const m = first?.match(/^vault-(\d+)$/)
  return m ? { vault: m[1], tab: second } : { tab: first }
}
