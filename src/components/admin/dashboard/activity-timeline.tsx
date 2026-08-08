'use client'

import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminActivityEvent } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import { formatAddress, formatHash, formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const STATUS_COLOR: Record<string, 'lime' | 'amber' | 'red' | 'neutral'> = {
  CONFIRMED: 'lime',
  indexed: 'lime',
  REQUESTED: 'amber',
  PENDING: 'amber',
  FAILED: 'red',
}

export function ActivityTimelinePanel({
  events,
  assetScale,
}: Readonly<{
  events: Availability<readonly AdminActivityEvent[]>
  assetScale: AdminAssetScale | null
}>) {
  const reduced = useReducedMotion()

  if (!isAvailable(events)) {
    if (isAdminNotConfigured(events)) {
      return <Text>Activity index not configured</Text>
    }
    return <Text>Data unavailable</Text>
  }
  if (events.value.length === 0) {
    return <Text>No recent activity</Text>
  }

  return (
    <ul data-widget="activity-timeline" className="relative space-y-0 border-l border-console-line pl-4">
      <AnimatePresence initial={false}>
        {events.value.map((event, index) => (
          <motion.li
            key={event.id}
            layout={!reduced}
            initial={reduced ? false : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: reduced ? 0 : index * 0.03 }}
            className="relative pb-4 last:pb-0"
          >
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-accent-400 ring-2 ring-console-card"
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink dark:text-fg">{event.title}</p>
                <p
                  className="mt-0.5 truncate text-xs text-fg-tertiary"
                  title={
                    event.clientLabel
                      ? `${event.clientLabel}${
                          event.amountAtomic !== null
                            ? ` · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
                            : ''
                        }`
                      : undefined
                  }
                >
                  {formatAddress(event.clientLabel) ?? event.clientLabel ?? '—'}
                  {event.amountAtomic !== null
                    ? ` · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
                    : null}
                </p>
                {event.txHash !== null ? (
                  <p className="mt-0.5 font-mono text-[11px] text-fg-secondary">{formatHash(event.txHash)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge color={STATUS_COLOR[event.status] ?? 'neutral'}>{event.status}</Badge>
                <span className="text-[11px] text-fg-tertiary">{formatRelativeTime(event.occurredAt)}</span>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
