import { DashboardUtilisateur } from './dashboard-utilisateur'
import { loadUserDashboard } from './load'

export const dynamic = 'force-dynamic'

/**
 * First page of the user side — investor-scoped dashboard.
 * Backend-first: data comes from the session read-model, every absence is a
 * named state. Shape ported from the prototype; colors/surfaces on DS tokens.
 */
export default async function Page() {
  const data = await loadUserDashboard()
  return <DashboardUtilisateur data={data} />
}
