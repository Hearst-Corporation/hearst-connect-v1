import { redirect } from 'next/navigation'

/** Les termes du produit sont une section de Settings, gouvernée comme les autres. */
export default function Page() {
  redirect('/admin/settings/terms')
}
