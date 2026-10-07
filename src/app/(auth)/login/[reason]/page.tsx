import type { Metadata } from 'next'

/* `/login/expired`, `/login/required` : l'écran de connexion, avec le mot qui dit pourquoi. */
export { default } from '../page'

export const metadata: Metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'
