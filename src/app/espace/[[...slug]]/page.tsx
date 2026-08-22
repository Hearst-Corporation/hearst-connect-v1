import { redirect } from 'next/navigation'

/** Legacy `/espace/*` URLs — canonical account lives at `/account`. */
export default function Page() {
  redirect('/account')
}
