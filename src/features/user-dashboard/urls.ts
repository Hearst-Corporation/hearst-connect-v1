import type { VaultTab } from './user-dashboard'

/** Le mot de l'onglet dans l'URL : celui que le client lit à l'écran. */
const SLUG: Record<VaultTab, string> = { overview: 'overview', compute: 'strategy', activity: 'movements' }

export const tabSlug = (tab: VaultTab): string => SLUG[tab]

/**
 * L'adresse de My Vault : `/account?vault=2&tab=strategy`. Le vault par son
 * rang chez le client, jamais `31337-0x1111…` ; l'Overview sans `tab`.
 */
export function accountHref(vault: number | string | undefined, tab: VaultTab = 'overview'): string {
  const q = [vault !== undefined && vault !== '' ? `vault=${vault}` : null, tab !== 'overview' ? `tab=${SLUG[tab]}` : null]
    .filter(Boolean)
    .join('&')
  return `/account${q ? `?${q}` : ''}`
}
