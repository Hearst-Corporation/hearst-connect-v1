'use client'

import { AppStoreCards, type AppStoreCardItem } from '@/components/ui/app-store-cards'

/**
 * Act 2 — Proof. Shared-layout cards: one domain expands on click. Visuals are stylized
 * console PREVIEWS (brand assets), not live captures.
 */
const ITEMS: readonly AppStoreCardItem[] = [
  {
    id: 'access',
    category: 'Access',
    title: 'One portal for all your Hearst workspaces',
    paragraphs: [
      'Identities, permissions, and access logs live in a single console — without multiplying tools or passwords.',
      'Each member sees only what their role allows. In the product, data comes from the Hearst backend, never from a placeholder.',
    ],
    image: '/brand/console-preview.png',
    imageStyle: { top: -40 },
  },
  {
    id: 'vaults',
    category: 'Vaults',
    title: 'Vault and strategy oversight',
    paragraphs: [
      'Track vault status, contract addresses, and indexed movements, with a named state when the source is absent.',
      'Charts and indicators are not invented: an empty series stays empty, unavailability is shown as such.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { bottom: -40, width: '120%', left: -40 },
  },
  {
    id: 'compliance',
    category: 'Compliance',
    title: 'KYC and obligations, without blind spots',
    paragraphs: [
      'The Compliance console centralizes client files and watchpoints raised by Hearst services.',
      'Every status is traceable: no forced green badge when the backend confirms nothing.',
    ],
    image: '/brand/console-preview.png',
    imageStyle: { top: -160, width: '200%', left: -120 },
  },
  {
    id: 'operations',
    category: 'Operations',
    title: 'Movement journal, timestamped',
    paragraphs: [
      'Operations aggregates events with readable labels and relative timestamps, ready to scan.',
      'Movements are shown as measured — never simulated.',
    ],
    image: '/brand/console-glow.png',
    imageStyle: { top: -60, width: '110%' },
  },
] as const

export function AppStoreDemo() {
  return <AppStoreCards items={ITEMS} />
}
