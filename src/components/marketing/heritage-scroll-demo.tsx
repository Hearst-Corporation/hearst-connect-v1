'use client'

import { ScrollVelocityPlanes } from '@/components/ui/scroll-velocity-planes'

const LABELS = [
  'Accès unifié',
  'Coffres',
  'Clients',
  'Conformité',
  'Opérations',
  'Journal Série 1',
  'Vaults',
  'Keeper',
  'Runtime',
  'API Explorer',
  'Profil',
  'Membres',
  'Connexions',
  'Paramètres',
  'Activité',
  'Pilotage',
] as const

/** Motion heritage carousel — assets brand Hearst, tokens console. */
export function HeritageScrollDemo() {
  return (
    <ScrollVelocityPlanes
      title="HEARST CONNECT"
      titleLine2="ESPACES"
      count={LABELS.length}
      hint="faire défiler"
      labels={LABELS}
    />
  )
}
