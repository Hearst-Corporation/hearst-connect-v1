'use client'

import { PanelState } from '@/components/admin/dashboard/panel-state'
import { toneForActivityStatus } from '@/components/admin/status-tone'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  BoltIcon,
} from '@heroicons/react/16/solid'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatEventAtomic } from '@/lib/admin-dashboard/format-atomic'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import type { AdminActivityEvent } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured } from '@/lib/admin-dashboard/contracts'
import { formatAddress, formatDate } from '@/lib/format'
import { movementLabel } from '@/lib/movements'
import { isAvailable, type Availability } from '@/lib/vaults/model'

function eventClientTitle(
  event: AdminActivityEvent,
  assetScale: AdminAssetScale | null,
): string | undefined {
  if (event.clientLabel === null || event.clientLabel === '') return undefined
  if (event.amountBtcSats != null) return `${event.clientLabel} · ${btcFromSats(event.amountBtcSats)}`
  if (event.amountAtomic === null) return event.clientLabel
  return `${event.clientLabel} · ${formatEventAtomic(event.amountAtomic, event.asset, assetScale)}`
}

/** Le libellé du mouvement, en casse de phrase : « DEPOSIT » criait. */
function readableType(type: string): string {
  const label = movementLabel(type)
  if (label !== label.toUpperCase()) return label
  const lower = label.toLowerCase().replaceAll('_', ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Un nom de client s'affiche en entier ; seule une adresse brute s'abrège. */
function clientName(label: string | null): string | null {
  if (label === null || label === '') return null
  return /^0x[0-9a-f]{8,}$/i.test(label) ? formatAddress(label) : label
}

function iconFor(type: string) {
  const key = type.toUpperCase()
  if (key.includes('DEPOSIT')) return ArrowDownTrayIcon
  if (key.includes('WITHDRAW')) return ArrowUpTrayIcon
  if (key.includes('REBALANCE')) return ArrowPathIcon
  if (key.includes('DISTRIBUT') || key.includes('YIELD')) return BanknotesIcon
  return BoltIcon
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
        Un registre, pas une frise : le type et le client à gauche, le montant
        à droite, en chiffres pleins. Le hash de transaction et le statut
        « confirmé » répétés à chaque ligne n'aidaient pas à lire — seul un
        statut ANORMAL (en attente, échoué) est encore affiché.

        The card's fixed slot owns the height (row-matched); the list fills it
        and scrolls inside — dataset never owns geometry.
      */}
      <ul className="min-h-0 flex-1 divide-y divide-[var(--ud-line)] overflow-y-auto scrollbar-none">
        {events.value.map((event) => {
          const Icon = iconFor(event.type)
          const tone = toneForActivityStatus(event.status)
          const client = clientName(event.clientLabel)
          return (
            <li key={event.id} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ud-inset)] ring-1 ring-[var(--ud-line)]">
                <Icon className="size-4 text-[var(--hearst-green)]" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{readableType(event.type)}</p>
                <p className="truncate text-xs text-fg-tertiary" title={eventClientTitle(event, assetScale)}>
                  {client ?? 'Vault not reported'}
                  {tone !== 'accent' ? ` · ${event.status.toLowerCase()}` : null}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-medium tabular-nums text-fg">
                  {event.amountBtcSats != null
                    ? btcFromSats(event.amountBtcSats)
                    : event.amountAtomic !== null
                    ? formatEventAtomic(event.amountAtomic, event.asset, assetScale)
                    : '—'}
                </p>
                <p className="text-[11px] text-fg-tertiary">{formatDate(event.occurredAt)}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
