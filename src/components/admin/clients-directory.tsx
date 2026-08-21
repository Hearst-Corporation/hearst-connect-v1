'use client'

import { PanelState } from '@/components/admin/dashboard/panel-state'
import { AdminToneBadge, toneForKycStatus } from '@/components/admin/status-tone'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import { Badge } from '@/components/catalyst/badge'
import { Input } from '@/components/catalyst/input'
import { Link } from '@/components/catalyst/link'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatAdminAtomic, type AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatRelativeTime } from '@/lib/format'
import { useSearchParams } from 'next/navigation'
import { kycStatusLabel } from '@/lib/labels'
import { useMemo, useState } from 'react'

type FilterId = 'all' | 'with-exposure' | 'kyc-pending' | 'kyc-approved' | 'needs-attention'

const FILTERS: readonly { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'with-exposure', label: 'With exposure' },
  { id: 'kyc-pending', label: 'KYC pending' },
  { id: 'kyc-approved', label: 'KYC approved' },
  { id: 'needs-attention', label: 'Needs attention' },
]

function hasExposure(client: AdminRecentClient): boolean {
  if (client.currentExposureAtomic === null || client.currentExposureAtomic === '') return false
  const n = Number(client.currentExposureAtomic)
  return Number.isFinite(n) && n > 0
}

function kycKey(status: string): string {
  return status.trim().toUpperCase()
}

function matchesFilter(client: AdminRecentClient, filter: FilterId): boolean {
  const kyc = kycKey(client.kycStatus)
  switch (filter) {
    case 'all':
      return true
    case 'with-exposure':
      return hasExposure(client)
    case 'kyc-pending':
      return kyc === 'PENDING' || kyc === 'EN_ATTENTE' || kyc === 'IN_REVIEW' || kyc === 'IN_PROGRESS'
    case 'kyc-approved':
      return kyc === 'APPROVED' || kyc === 'VERIFIED'
    case 'needs-attention':
      return (
        kyc === 'PENDING' ||
        kyc === 'EN_ATTENTE' ||
        kyc === 'IN_REVIEW' ||
        kyc === 'IN_PROGRESS' ||
        kyc === 'REJECTED' ||
        kyc === 'DENIED' ||
        kyc === 'REQUIRED' ||
        kyc === 'EXPIRED' ||
        kyc === 'HIGH_RISK'
      )
  }
}

/**
 * Directory CONTENT — the DashCard frame (title row, count, frozen height)
 * lives on the page so the box keeps the same shape across rich / thin /
 * empty / unavailable states. Here: toolbar (search + filters + live count),
 * then ONE scroll region holding the desktop table and the mobile card list.
 */
export function ClientsDirectory({
  clients,
  assetScale,
}: Readonly<{ clients: readonly AdminRecentClient[]; assetScale: AdminAssetScale | null }>) {
  // Pre-fill from the header search (`/admin/clients?q=…`): the field stays
  // controllable afterwards. No data is fabricated — we only initialize the
  // local filter from the real data already loaded.
  const initialQuery = useSearchParams().get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const [filter, setFilter] = useState<FilterId>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((client) => {
      if (!matchesFilter(client, filter)) return false
      if (q === '') return true
      return (
        client.label.toLowerCase().includes(q) ||
        client.id.toLowerCase().includes(q) ||
        client.kycStatus.toLowerCase().includes(q)
      )
    })
  }, [clients, filter, query])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            type="search"
            name="client-search"
            placeholder="Search clients"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search clients"
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
          <Badge color="neutral">{`${filtered.length} of ${clients.length}`}</Badge>
          <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">Client filters</legend>
            {FILTERS.map((item) => {
              const active = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={active}
                  className={
                    active
                      ? 'rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent-300 ring-1 ring-accent-400/30'
                      : 'rounded-lg px-3 py-1.5 text-xs font-medium text-fg-tertiary ring-1 ring-console-line-soft hover:text-fg'
                  }
                >
                  {item.label}
                </button>
              )
            })}
          </fieldset>
        </div>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-none">
        {filtered.length === 0 ? (
          <PanelState title="No clients match this search or filter." />
        ) : (
          <>
            <div className="hidden min-w-0 md:block">
              <AdminTable className="[&_table]:min-w-[40rem]">
                <TableHead>
                  <TableRow>
                    <TableHeader className={tableCol.primary}>Client</TableHeader>
                    <TableHeader className={tableCol.numeric}>Exposure</TableHeader>
                    <TableHeader className={tableCol.numeric}>Vaults</TableHeader>
                    <TableHeader className={tableCol.status}>KYC</TableHeader>
                    <TableHeader className={tableCol.date}>Activity</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((client) => (
                    <TableRow
                      key={client.id}
                      href={`/admin/client-simulator/${client.id}`}
                      title={`Open ${client.label}`}
                    >
                      <TableCell className={tableCol.primary}>
                        <div className="truncate font-medium text-fg">{client.label}</div>
                      </TableCell>
                      <TableCell className={tableCol.numeric}>
                        {assetScale
                          ? formatAdminAtomic(client.currentExposureAtomic, assetScale)
                          : '—'}
                      </TableCell>
                      <TableCell className={`${tableCol.numeric} text-fg-tertiary`}>
                        {client.vaultIds.length === 0 ? '—' : String(client.vaultIds.length)}
                      </TableCell>
                      <TableCell className={tableCol.status}>
                        <AdminToneBadge tone={toneForKycStatus(client.kycStatus)}>
                          {kycStatusLabel(client.kycStatus)}
                        </AdminToneBadge>
                      </TableCell>
                      <TableCell className={`${tableCol.date} text-fg-tertiary`}>
                        {client.lastActivityAt ? formatRelativeTime(client.lastActivityAt) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </AdminTable>
            </div>

            <ul className="space-y-3 md:hidden" aria-label="Client directory">
              {filtered.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/admin/client-simulator/${client.id}`}
                    className={clsx(surfaceBox, 'block p-4')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-fg">{client.label}</p>
                      <AdminToneBadge tone={toneForKycStatus(client.kycStatus)}>{kycStatusLabel(client.kycStatus)}</AdminToneBadge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-fg-tertiary">Exposure</dt>
                        <dd className="mt-0.5 tabular-nums text-fg">
                          {assetScale ? formatAdminAtomic(client.currentExposureAtomic, assetScale) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-fg-tertiary">Vaults</dt>
                        <dd className="mt-0.5 tabular-nums text-fg">
                          {client.vaultIds.length === 0 ? '—' : String(client.vaultIds.length)}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-3 text-xs text-fg-tertiary">
                      Activity · {client.lastActivityAt ? formatRelativeTime(client.lastActivityAt) : '—'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
