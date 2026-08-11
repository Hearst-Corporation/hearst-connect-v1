import { redirect } from 'next/navigation'

/** Legacy French path — canonical hub is `/account`. */
export default function Page() {
  redirect('/account')
}
