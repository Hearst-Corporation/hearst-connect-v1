import { redirect } from 'next/navigation'

/** Canonical redirect to the consolidated product surface. */
export function redirectToProduct(): never {
  redirect('/admin/settings/terms')
}
