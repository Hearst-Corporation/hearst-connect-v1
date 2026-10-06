'use server'

import { loadAdminInbox, type InboxItem } from '@/lib/notifications/inbox'
import { getSession } from '@/lib/session'

/** La cloche se rafraîchit seule : la mise en page de la console n'est pas
 *  recalculée à chaque navigation, donc la liste doit se relire. */
export async function refreshInbox(): Promise<readonly InboxItem[]> {
  if ((await getSession()) === null) return []
  return loadAdminInbox()
}
