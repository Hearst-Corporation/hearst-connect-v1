import { AdminToneBadge } from '@/components/admin/status-tone'

/**
 * Marqueur « client simulé » — chaque surface du simulateur l’affiche pour
 * distinguer un compte créé via POST /api/v1/admin/users d’un client réel.
 */
export function SimulatedBadge() {
  return <AdminToneBadge tone="warn" showDot>Simulated</AdminToneBadge>
}
