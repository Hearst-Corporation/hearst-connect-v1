import { redirect } from 'next/navigation'

/** Redirection canonique vers la surface produit consolidée. */
export function redirectVersProduit(): never {
  redirect('/admin/produit')
}
