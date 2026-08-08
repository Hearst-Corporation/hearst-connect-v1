'use client'

import { ScrollVelocityPlanes } from '@/components/ui/scroll-velocity-planes'

const LABELS = [
  'Unified access',
  'Vaults',
  'Clients',
  'Compliance',
  'Operations',
  'Series 1 journal',
  'Vaults',
  'Keeper',
  'Runtime',
  'API Explorer',
  'Profile',
  'Members',
  'Sign-ins',
  'Settings',
  'Activity',
  'Oversight',
] as const

/** Motion heritage carousel — Hearst brand assets, console tokens. */
export function HeritageScrollDemo() {
  return (
    <ScrollVelocityPlanes
      title="HEARST CONNECT"
      titleLine2="WORKSPACES"
      count={LABELS.length}
      hint="scroll"
      labels={LABELS}
    />
  )
}
