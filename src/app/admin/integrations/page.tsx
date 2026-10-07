import { redirect } from 'next/navigation'

/** Déplacée dans Settings. */
export default function Page() {
  redirect('/admin/settings/integrations')
}
