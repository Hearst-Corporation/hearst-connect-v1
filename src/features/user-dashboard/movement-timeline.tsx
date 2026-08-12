'use client'

import { motion, type Variants } from 'motion/react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BoltIcon,
  CpuChipIcon,
  ArrowsRightLeftIcon,
  GiftIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { ClockIcon } from '@heroicons/react/16/solid'
import type { ComponentType, SVGProps } from 'react'
import { formatCurrency, formatRelativeTime } from '@/lib/format'
import { valueOf } from '@/lib/vaults/model'
import { useMotionReady } from './motion-guard'
import type { UserDashboard, UserMovement } from './load'

/**
 * Premium investor movement timeline — a left-rail stepper with a per-category
 * Heroicon medallion, a category chip and relative time, staggered on entrance.
 *
 * Honest by construction: `UserMovement` carries {id, title, detail (kind),
 * amountUsdc, occurredAt}. The amount renders as USD, or "—" when the source
 * carries none — never as 0. txHash is used only as a row key: no explorer link
 * is shown (that URL is not wired). The two named-absence branches are preserved:
 * an unreadable source and an empty window are distinct facts, never collapsed
 * into an empty timeline.
 */

const MOVEMENT_ICON: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  // Client ledger kinds (InvestorTransaction.type).
  deposit: ArrowDownTrayIcon,
  withdraw: ArrowUpTrayIcon,
  claim: BanknotesIcon,
  distribution: GiftIcon,
  // Legacy category fallbacks (defensive — other feeds).
  mining: CpuChipIcon,
  strategy: ArrowsRightLeftIcon,
  user: UserCircleIcon,
  electricity: BoltIcon,
}

function movementIcon(kind: string | null) {
  const Cmp = (kind !== null && MOVEMENT_ICON[kind]) || Squares2X2Icon
  return <Cmp className="size-4" aria-hidden="true" />
}

function chipLabel(category: string | null): string {
  if (category === null || category === '') return 'Movement'
  return category.charAt(0).toUpperCase() + category.slice(1)
}

function Row({ movement }: Readonly<{ movement: UserMovement }>) {
  return (
    <div className="timeline-item">
      <span className="timeline-node" aria-hidden="true">
        {movementIcon(movement.detail)}
      </span>
      <div className="timeline-body">
        <p className="timeline-title">{movement.title}</p>
        <div className="timeline-meta">
          <span className="timeline-amount">
            {formatCurrency(movement.amountUsdc, { fromAtomic: 1 })}
          </span>
          <span className="timeline-chip">{chipLabel(movement.detail)}</span>
          {movement.occurredAt !== null ? (
            <span className="timeline-time">
              <ClockIcon className="size-3" aria-hidden="true" />
              {formatRelativeTime(movement.occurredAt)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
}

export function MovementTimeline({ availability }: Readonly<{ availability: UserDashboard['activity'] }>) {
  const animate = useMotionReady()
  const rows = valueOf(availability)

  if (rows === null || rows.length === 0) {
    return (
      <div className="empty">
        <span className="empty-mark" />
        <div>
          <p className="eyebrow">Account history</p>
          <h3>{rows === null ? 'Activity source unavailable' : 'No verified activity yet'}</h3>
          <span>
            {rows === null
              ? 'The verified activity source did not resolve — nothing is shown rather than a guess.'
              : 'Your deposits, distributions and account events will appear here from the verified source, most recent first.'}
          </span>
        </div>
      </div>
    )
  }

  if (!animate) {
    return (
      <ul className="timeline" aria-label="Account movements">
        {rows.map((movement) => (
          <li key={movement.id}>
            <Row movement={movement} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <motion.ul
      className="timeline"
      aria-label="Account movements"
      initial="hidden"
      animate="show"
      variants={listVariants}
    >
      {rows.map((movement) => (
        <motion.li key={movement.id} variants={itemVariants}>
          <Row movement={movement} />
        </motion.li>
      ))}
    </motion.ul>
  )
}
