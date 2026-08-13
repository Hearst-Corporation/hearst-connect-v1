'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { AdminToneBadge, toneForActivityStatus } from '@/components/admin/status-tone'
import { Text } from '@/components/catalyst/text'
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
        <div className="space-y-4" data-widget="activity-timeline">
          <div className="flex flex-col justify-center gap-2 py-5">
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
      <div className="space-y-4" data-widget="activity-timeline">
        <div className="flex flex-col justify-center gap-2 py-5">
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
      <div className="space-y-4" data-widget="activity-timeline">
        <div className="flex flex-col justify-center gap-2 py-5">
          <p className="text-sm font-semibold text-ink dark:text-fg">No recent activity</p>
          <Text>No events in the current window.</Text>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
          <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-widget="activity-timeline">
      <ul className="relative space-y-4 border-l border-console-line pl-4">
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
                <p className="text-sm font-semibold text-ink dark:text-fg">{movementLabel(event.type)}</p>
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

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
        <HearstSecondaryAction href="/admin/operations">View all activity</HearstSecondaryAction>
      </div>
    </div>
  )
}
