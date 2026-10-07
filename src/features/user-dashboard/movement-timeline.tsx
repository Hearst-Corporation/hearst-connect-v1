'use client'

import { motion, type Variants } from 'motion/react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BoltIcon,
  CpuChipIcon,
  ArrowsRightLeftIcon,
  ChevronRightIcon,
  GiftIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { formatBtc, formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { valueOf } from '@/lib/vaults/model'
import { useMotionReady } from './motion-guard'
import type { UserDashboard, UserMovement } from './load'

/**
 * Premium investor movement timeline — a left-rail stepper with a per-category
 * Heroicon medallion, the date and the amount, staggered on entrance.
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

/** Le ton du tag : en cours (ambre), refusé (gris), réglé (vert). */
const STATUS_TONE: Record<string, string> = { Pending: 'wait', Processing: 'wait', Declined: 'off' }

/** Hash tronqué : lisible, et suffisant pour recouper une transaction. */
function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : hash
}

function Row({
  movement,
  btcSpotUsd,
}: Readonly<{ movement: UserMovement; btcSpotUsd: number | null }>) {
  const [open, setOpen] = useState(false)

  // Le BTC porte la valeur PRINCIPALE — c'est l'unité du produit —, le dollar
  // sa contrevaleur. Le montant bitcoin reste DÉRIVÉ du book au spot : sans
  // cours lisible, la colonne reste vide plutôt que d'afficher un taux supposé.
  const btc =
    movement.btc != null
      ? formatBtc(movement.btc)
      : movement.amountUsdc !== null && btcSpotUsd !== null && btcSpotUsd > 0
      ? formatBtc(movement.amountUsdc / btcSpotUsd)
      : null

  return (
    // Toute la ligne s'ouvre au clic, comme les tableaux de la console : un
    // survol gris et un chevron vert plutôt qu'un bouton par ligne.
    <div
      className={`timeline-item timeline-item--link${open ? ' is-open' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setOpen((v) => !v)
        }
      }}
    >
      <span className="timeline-node" aria-hidden="true">
        {movementIcon(movement.detail)}
      </span>
      <div className="timeline-body">
        <p className="timeline-title">
          {movement.title}
        </p>
        <div className="timeline-meta">
          <span className="timeline-date">
            {movement.occurredAt !== null ? formatDate(movement.occurredAt) : '—'}
          </span>
          {/* Bitcoin d'abord, en corps principal ; le dollar suit, en creux. */}
          <span className="timeline-amount">{btc ?? '—'}</span>
          <span className="timeline-btc">
            ≈ {formatCurrency(movement.amountUsdc, { fromAtomic: 1 })}
          </span>
          {/* Pas d'ancienneté relative : la date absolue est déjà sur la ligne,
              et « 12 d ago » redisait la même chose en moins précis. */}
          {/* Le statut a sa propre colonne, à droite : il ne décale plus
              l'intitulé, et la colonne reste vide quand tout est réglé. */}
          <span className="timeline-status-cell">
            {movement.status ? (
              <span className="timeline-status" data-tone={STATUS_TONE[movement.status] ?? 'done'}>
                {movement.status}
              </span>
            ) : null}
          </span>

          <ChevronRightIcon className="timeline-detail timeline-chevron" aria-hidden="true" />
        </div>

        {/* Le dépli ne charge rien : il montre ce que la ligne ne peut pas tenir
            — le hash on-chain et l'horodatage complet. Pas de lien explorateur,
            aucune URL n'est câblée côté produit. */}
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
const COLLAPSED_COUNT = 7

const listVariants: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: 'easeOut' } },
}

export function MovementTimeline({
  availability,
  btcSpotUsd = null,
  actions = null,
}: Readonly<{
  availability: UserDashboard['activity']
  btcSpotUsd?: number | null
  /** Les exports, au pied, à côté de « Show more » — comme les tableaux de la console. */
  actions?: ReactNode
}>) {
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
    hidden > 0 || actions !== null ? (
      <div className="timeline-tail">
        {actions}
        {hidden > 0 ? (
          <button type="button" className="timeline-toggle" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `Show all ${rows.length}`}
          </button>
        ) : null}
      </div>
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
