import { redirect } from 'next/navigation'

/** Ancienne URL — un seul tableau de bord sur `/admin`. */
export default function Page() {
  redirect('/admin')
}
