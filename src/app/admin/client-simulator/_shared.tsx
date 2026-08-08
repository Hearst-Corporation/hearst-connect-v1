import { Badge } from '@/components/catalyst/badge'

/**
 * Marqueur « client simulé » — chaque surface du simulateur l’affiche pour
 * distinguer un compte créé via POST /api/v1/admin/users d’un client réel.
 */
export function SimulatedBadge() {
  return <Badge color="amber">Simulated</Badge>
}
