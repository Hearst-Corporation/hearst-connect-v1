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
import { useState, type ComponentType, type SVGProps } from 'react'
import { formatCurrency, formatDate, formatDateTime, formatRelativeTime } from '@/lib/format'
import { valueOf } from '@/lib/vaults/model'
import { useMotionReady } from './motion-guard'
import type { UserDashboard, UserMovement } from './load'

/**
 * Premium investor movement timeline — a left-rail stepper with a per-category
 * Heroicon medallion, the amount and relative time, staggered on entrance.
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

/** Hash tronqué : lisible, et suffisant pour recouper une transaction. */
function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash
}

function Row({
  movement,
  btcSpotUsd,
}: Readonly<{ movement: UserMovement; btcSpotUsd: number | null }>) {
  const [open, setOpen] = useState(false)

  // Contrevaleur au spot : dérivée, jamais un montant lu au book. Sans cours
  // lisible, la colonne reste vide plutôt que d'afficher un taux supposé.
  const btc =
    movement.amountUsdc !== null && btcSpotUsd !== null && btcSpotUsd > 0
      ? `≈ ${(movement.amountUsdc / btcSpotUsd).toFixed(4)} BTC`
      : null

  return (
    <div className="timeline-item">
      <span className="timeline-node" aria-hidden="true">
        {movementIcon(movement.detail)}
      </span>
      <div className="timeline-body">
        <p className="timeline-title">{movement.title}</p>
        <div className="timeline-meta">
          <span className="timeline-date">
            {movement.occurredAt !== null ? formatDate(movement.occurredAt) : '—'}
          </span>
          <span className="timeline-amount">
            {formatCurrency(movement.amountUsdc, { fromAtomic: 1 })}
          </span>
          <span className="timeline-btc">{btc ?? ''}</span>
          {movement.occurredAt !== null ? (
            <span className="timeline-time">
              <ClockIcon className="size-3" aria-hidden="true" />
              {formatRelativeTime(movement.occurredAt)}
            </span>
          ) : (
            <span />
          )}
          {/* Piste vide : écarte l'action de l'ancienneté sans padding ad hoc. */}
          <span aria-hidden="true" />

          <button
            type="button"
            className="timeline-detail"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Hide' : 'Detail'}
          </button>
        </div>

        {/* Le dépli ne charge rien : il montre ce que la ligne ne peut pas tenir
            — le hash on-chain et l'horodatage complet. Pas de lien explorateur,
            aucune URL n'est câblée. */}
        {open ? (
          <dl className="timeline-detail-body">
            <dt>Transaction</dt>
            <dd className="mono">
              {movement.txHash !== null ? shortHash(movement.txHash) : 'not reported'}
            </dd>
            <dt>Recorded</dt>
            <dd>
              {movement.occurredAt !== null ? formatDateTime(movement.occurredAt) : 'not reported'}
            </dd>
          </dl>
        ) : null}
      </div>
    </div>
  )
}

/** Lignes visibles tant que la liste est repliée. */
const COLLAPSED_COUNT = 5

const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
}

export function MovementTimeline({
  availability,
  btcSpotUsd = null,
}: Readonly<{ availability: UserDashboard['activity']; btcSpotUsd?: number | null }>) {
  const animate = useMotionReady()
  const [expanded, setExpanded] = useState(false)
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

  // Repli : les cinq mouvements les plus récents, le reste sur demande. Le
  // compte total reste annoncé par le bouton — on ne masque pas l'existence
  // des lignes, seulement leur affichage.
  const hidden = rows.length - COLLAPSED_COUNT
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT)

  const toggle =
    hidden > 0 ? (
      <button type="button" className="timeline-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Show less' : `Show ${hidden} more`}
      </button>
    ) : null

  if (!animate) {
    return (
      <>
        <ul className="timeline" aria-label="Your movements">
          {visible.map((movement) => (
            <li key={movement.id}>
              <Row movement={movement} btcSpotUsd={btcSpotUsd} />
            </li>
          ))}
        </ul>
        {toggle}
      </>
    )
  }

  return (
    <>
      <motion.ul
        className="timeline"
        aria-label="Your movements"
        initial="hidden"
        animate="show"
        variants={listVariants}
      >
        {visible.map((movement) => (
          <motion.li key={movement.id} variants={itemVariants}>
            <Row movement={movement} btcSpotUsd={btcSpotUsd} />
          </motion.li>
        ))}
      </motion.ul>
      {toggle}
    </>
  )
}
