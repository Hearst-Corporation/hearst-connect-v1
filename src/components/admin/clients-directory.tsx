'use client'

import { PaginatedTable } from '@/components/admin/paginated-table'
import { SegSelect } from '@/components/admin/seg-select'
import { PanelState } from '@/components/admin/dashboard/panel-state'
import { AdminToneBadge, toneForKycStatus } from '@/components/admin/status-tone'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import { Badge } from '@/components/catalyst/badge'
import { Input } from '@/components/catalyst/input'
import { Link } from '@/components/catalyst/link'
import {
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { tableCol } from '@/components/compositions'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatAdminAtomic, type AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatDate } from '@/lib/format'
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
          {/* Le sélecteur du bloc vault de /account : piste sombre, choix actif
              en aplat blanc. */}
          <SegSelect
            label="Client filters"
            value={filter}
            options={FILTERS.map((item) => ({ value: item.id, label: item.label }))}
            onChange={setFilter}
          />
          <fieldset className="ud-seg seg-collapsible m-0 min-w-0 border-0">
            <legend className="sr-only">Client filters</legend>
            {FILTERS.map((item) => {
              const active = filter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={active}
                  className={`ud-seg-btn${active ? ' active' : ''}`}
                >
                  {item.label}
                </button>
              )
            })}
          </fieldset>
        </div>
      </div>

      <div className="min-w-0">
        {filtered.length === 0 ? (
          <PanelState title="No clients match this search or filter." />
        ) : (
          <>
            <div className="hidden min-w-0 md:block">
              {/* Le gabarit du tableau des vaults du tableau de bord : pleine
                  largeur, colonnes aérées, bords calés sur la carte pour que les
                  boutons « Open » tombent sous ceux de l'en-tête. */}
              <PaginatedTable
                className="[&_table]:w-full [&_table]:min-w-[40rem] [&_td]:px-4 [&_th]:px-4 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0"
                noun="clients"
                collapsed={10}
                head={
                  <TableRow>
                    <TableHeader className={tableCol.primary}>Client</TableHeader>
                    <TableHeader className={tableCol.numeric}>Exposure</TableHeader>
                    <TableHeader className={tableCol.numeric}>Vaults</TableHeader>
                    <TableHeader className={tableCol.status}>KYC</TableHeader>
                    <TableHeader className={tableCol.date}>Last activity</TableHeader>
                    <TableHeader className={tableCol.action}>
                      <span className="sr-only">Open</span>
                    </TableHeader>
                  </TableRow>
                }
                rows={filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className={tableCol.primary}>
                        <div className="truncate font-medium text-fg">{client.label}</div>
                        <div className="text-xs text-fg-tertiary">Client since {formatDate(client.createdAt)}</div>
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
                        {client.lastActivityAt ? formatDate(client.lastActivityAt) : '—'}
                      </TableCell>
                      {/* Le bouton vert de /account : la ligne n'est plus un
                          lien invisible, le bouton dit où l'on clique. */}
                      <TableCell className={tableCol.action}>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="ud-detail-btn inline-flex items-center no-underline"
                          aria-label={`Open ${client.label}`}
                        >
                          Open
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                exportData={{
                  filename: 'hearst-client-directory',
                  title: 'Client directory',
                  columns: ['Client', 'Exposure (atomic)', 'Vaults', 'KYC', 'Last activity', 'Client since'],
                  data: filtered.map((c) => [c.label, c.currentExposureAtomic, c.vaultIds.length, kycStatusLabel(c.kycStatus), c.lastActivityAt, c.createdAt]),
                }}
              />
            </div>

            <ul className="space-y-3 md:hidden" aria-label="Client directory">
              {filtered.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/admin/clients/${client.id}`}
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
                      Activity · {client.lastActivityAt ? formatDate(client.lastActivityAt) : '—'}
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
