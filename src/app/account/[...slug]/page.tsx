import type { Metadata } from 'next'

/* `/account/mining`, `/account/vault-2/movements` : My Vault, le vault et l'onglet dans le chemin. */
export { default } from '../page'

export const metadata: Metadata = { title: 'My vault' }
export const dynamic = 'force-dynamic'
