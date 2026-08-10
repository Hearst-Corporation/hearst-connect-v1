import { redirect } from 'next/navigation'

/** Legacy URL — a single dashboard lives at `/admin`. */
export default function Page() {
  redirect('/admin')
}
