'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { AdminToneBadge, toneForActivityStatus } from '@/components/admin/status-tone'
import { surfaceInset } from '@/components/admin/surface'
import { Text } from '@/components/catalyst/text'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminActivityEvent } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import { formatAddress, formatHash, formatRelativeTime, pluralSuffix } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'

const MAX_VISIBLE_EVENTS = 5
const TIMELINE_SLOT_CLASS = 'min-h-[var(--dashboard-list-slot-block-size)]'

function eventClientTitle(
  event: AdminActivityEvent,
  assetScale: AdminAssetScale | null,
): string | undefined {
  if (event.clientLabel === null || event.clientLabel === '') return undefined
  if (event.amountAtomic === null) return event.clientLabel
  return `${event.clientLabel} · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
}

export function ActivityTimelinePanel({
  events,
  assetScale,
}: Readonly<{
  events: Availability<readonly AdminActivityEvent[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(events)) {
    if (isAdminNotConfigured(events)) {
      return (
        <div className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
          <div className={surfaceInset + ` ${TIMELINE_SLOT_CLASS} flex flex-col justify-center gap-2 px-4 py-5`}>
            <p className="text-sm font-semibold text-ink dark:text-fg">Activity index not configured</p>
            <Text>No events indexed yet.</Text>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
            <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
          </div>
        </div>
      )
    }
    return (
      <div className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
        <div className={surfaceInset + ` ${TIMELINE_SLOT_CLASS} flex flex-col justify-center gap-2 px-4 py-5`}>
          <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
          <Text>Activity source unavailable.</Text>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
        </div>
      </div>
    )
  }
  if (events.value.length === 0) {
    return (
      <div className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4">
        <div className={surfaceInset + ` ${TIMELINE_SLOT_CLASS} flex flex-col justify-center gap-2 px-4 py-5`}>
          <p className="text-sm font-semibold text-ink dark:text-fg">No recent activity</p>
          <Text>The dashboard keeps the same timeline slot when events have not arrived yet.</Text>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
        </div>
      </div>
    )
  }

  const visibleEvents = events.value.slice(0, MAX_VISIBLE_EVENTS)
  const hiddenCount = Math.max(events.value.length - visibleEvents.length, 0)

  return (
    <div
      className="grid h-full min-h-0 grid-rows-[minmax(var(--dashboard-list-slot-block-size),auto)_auto] gap-4"
      data-widget="activity-timeline"
    >
      <div className={TIMELINE_SLOT_CLASS}>
        <ul className="relative space-y-4 border-l border-console-line pl-4">
          {visibleEvents.map((event) => (
            <li key={event.id} className="relative">
              <span
                aria-hidden="true"
                className="absolute top-1.5 left-[-1.3rem] size-2 rounded-full bg-accent-400 ring-2 ring-console-card"
              />
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink dark:text-fg">{event.title}</p>
                  <p
                    className="mt-0.5 truncate text-xs text-fg-tertiary"
                    title={eventClientTitle(event, assetScale)}
                  >
                    {formatAddress(event.clientLabel) ?? event.clientLabel ?? '—'}
                    {event.amountAtomic !== null
                      ? ` · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
                      : null}
                  </p>
                  {event.txHash !== null ? (
                    <p className="mt-0.5 truncate font-mono text-[11px] text-fg-secondary">{formatHash(event.txHash)}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <AdminToneBadge tone={toneForActivityStatus(event.status)}>{event.status}</AdminToneBadge>
                  <span className="text-[11px] text-fg-tertiary">{formatRelativeTime(event.occurredAt)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-console-line-soft pt-3">
        <Text>
          {hiddenCount > 0
            ? `${hiddenCount} older event${pluralSuffix(hiddenCount)} available in Operations.`
            : 'Latest activity snapshot.'}
        </Text>
        <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
      </div>
    </div>
  )
}
