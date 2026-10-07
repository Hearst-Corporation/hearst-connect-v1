import type { Metadata } from 'next'

/* `/admin/clients/cli_2/vault-2/rewards` : la même fiche, le vault et l'onglet dans le chemin. */
export { default } from '../page'

export const metadata: Metadata = { title: 'Client' }
export const dynamic = 'force-dynamic'
