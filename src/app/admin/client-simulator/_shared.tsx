import { AdminToneBadge } from '@/components/admin/status-tone'

/**
 * "Simulated client" marker — every simulator surface displays it to
 * distinguish an account created via POST /api/v1/admin/users from a real client.
 */
export function SimulatedBadge() {
  return <AdminToneBadge tone="warn" showDot>Simulated</AdminToneBadge>
}
