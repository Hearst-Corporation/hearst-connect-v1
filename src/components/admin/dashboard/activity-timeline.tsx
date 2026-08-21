'use client'

import { PanelState } from '@/components/admin/dashboard/panel-state'
import { AdminToneBadge, toneForActivityStatus } from '@/components/admin/status-tone'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminActivityEvent } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import { formatAddress, formatHash, formatRelativeTime } from '@/lib/format'
import { movementLabel } from '@/lib/movements'
import { isAvailable, type Availability } from '@/lib/vaults/model'

function eventClientTitle(
  event: AdminActivityEvent,
  assetScale: AdminAssetScale | null,
): string | undefined {
  if (event.clientLabel === null || event.clientLabel === '') return undefined
  if (event.amountAtomic === null) return event.clientLabel
  return `${event.clientLabel} · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
}

function TimelineState({ title, detail }: Readonly<{ title: string; detail: string }>) {
  return (
    <div data-widget="activity-timeline">
      <PanelState title={title} detail={detail} />
    </div>
  )
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
      return <TimelineState title="Activity index not configured" detail="No events indexed yet." />
    }
    return <TimelineState title="Data unavailable" detail="Activity source unavailable." />
  }

  if (events.value.length === 0) {
    return <TimelineState title="No recent activity" detail="No events in the current window." />
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-widget="activity-timeline">
      {/*
        The card's fixed slot owns the height (row-matched); the list fills it
        and scrolls inside — dataset never owns geometry.
      */}
      <ul className="relative min-h-0 flex-1 space-y-4 overflow-y-auto border-l border-console-line pl-4">
        {events.value.map((event) => (
          <li key={event.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 left-[-1.3rem] size-2 rounded-full bg-accent-400 ring-2 ring-console-card"
            />
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                {/* English vocabulary from the movement type (backend fact); the
                    backend `title` is localized copy and is not rendered here. */}
                <p className="text-sm font-semibold text-fg">{movementLabel(event.type)}</p>
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
  )
}
