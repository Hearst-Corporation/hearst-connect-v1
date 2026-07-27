import type { AccessEvent, Member } from '@/lib/demo-data'

/** Couleurs Catalyst officielles associées aux statuts métier. */
export const statusColor: Record<AccessEvent['status'], 'lime' | 'red' | 'amber'> = {
  Autorisé: 'lime',
  Refusé: 'red',
  'En attente': 'amber',
}

export const memberStatusColor: Record<Member['status'], 'lime' | 'amber' | 'zinc'> = {
  Actif: 'lime',
  Invité: 'amber',
  Suspendu: 'zinc',
}
