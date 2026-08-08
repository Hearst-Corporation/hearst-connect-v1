'use client'

import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import type { AdminActivityEvent } from '@/lib/admin-dashboard/load'
import { formatCurrency, formatHash, formatRelativeTime } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const STATUS_COLOR: Record<string, 'lime' | 'amber' | 'red' | 'zinc'> = {
  CONFIRMED: 'lime',
  indexed: 'lime',
  REQUESTED: 'amber',
  PENDING: 'amber',
  FAILED: 'red',
}

export function ActivityTimelinePanel({
  events,
}: Readonly<{ events: Availability<readonly AdminActivityEvent[]> }>) {
  const reduced = useReducedMotion()

  if (!isAvailable(events)) {
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
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">{event.title}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {event.clientLabel ?? '—'}
                  {event.amountAtomic !== null
                    ? ` · ${formatCurrency(event.amountAtomic, { fromAtomic: 1_000_000 })}`
                    : null}
                </p>
                {event.txHash !== null ? (
                  <p className="mt-0.5 font-mono text-[11px] text-zinc-400">{formatHash(event.txHash)}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge color={STATUS_COLOR[event.status] ?? 'zinc'}>{event.status}</Badge>
                <span className="text-[11px] text-zinc-500">{formatRelativeTime(event.occurredAt)}</span>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
