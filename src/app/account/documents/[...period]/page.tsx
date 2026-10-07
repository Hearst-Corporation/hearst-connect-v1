import type { Metadata } from 'next'

/* `/account/documents/2028-09/vault-2` : un relevé, sa période et son vault dans le chemin. */
export { default } from '../statement/page'

export const metadata: Metadata = { title: 'Statement' }
export const dynamic = 'force-dynamic'
