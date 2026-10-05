'use client'

import { PanelState } from '@/components/admin/dashboard/panel-state'
import { ToneMark, toneForKycStatus } from '@/components/admin/status-tone'
import { Input, InputGroup } from '@hearst/ui/catalyst/input'
import { FilterBar, PageTabs, ResultCount } from '@hearst/ui/page'
import { ListTable, RowBadge } from '@hearst/ui/table'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatAdminAtomic, type AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatRelativeTime } from '@/lib/format'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
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

function isFilter(value: string | null): value is FilterId {
  return FILTERS.some((item) => item.id === value)
}

function filterHref(id: FilterId, q: string | null): string {
  const params = new URLSearchParams()
  if (id !== 'all') params.set('filter', id)
  if (q) params.set('q', q)
  const search = params.toString()
  return search === '' ? '/admin/clients' : `/admin/clients?${search}`
}

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
 * Directory content — the DashCard frame lives on the page. Here: the filter
 * row (search, KYC filters as tabs, live count), then the list.
 */
export function ClientsDirectory({
  clients,
  assetScale,
}: Readonly<{ clients: readonly AdminRecentClient[]; assetScale: AdminAssetScale | null }>) {
  // Pre-fill from the header search (`/admin/clients?q=…`): the field stays
  // controllable afterwards. No data is fabricated — we only initialize the
  // local filter from the real data already loaded.
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [query, setQuery] = useState(initialQuery)
  const requested = searchParams.get('filter')
  const filter: FilterId = isFilter(requested) ? requested : 'all'

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
      <FilterBar actions={<ResultCount>{`${filtered.length} of ${clients.length}`}</ResultCount>}>
        <div className="w-full sm:w-72">
          <InputGroup>
            <MagnifyingGlassIcon data-slot="icon" />
            <Input
              type="search"
              name="client-search"
              placeholder="Search clients"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search clients"
            />
          </InputGroup>
        </div>
        <PageTabs
          label="Client filters"
          tabs={FILTERS.map((item) => ({
            label: item.label,
            href: filterHref(item.id, searchParams.get('q')),
            current: filter === item.id,
          }))}
        />
      </FilterBar>

      <ListTable
        label="Client directory"
        className="-mx-5"
        rows={filtered}
        rowKey={(client) => client.id}
        href={(client) => `/admin/client-simulator/${client.id}`}
        rowLabel={(client) => `Open ${client.label}`}
        empty={<PanelState title="No clients match this search or filter." />}
        identity={{
          header: 'Client',
          badge: (client) => <RowBadge name={client.label} />,
          title: (client) => client.label,
          detail: (client) => (client.lastActivityAt ? formatRelativeTime(client.lastActivityAt) : 'No activity'),
        }}
        columns={[
          {
            key: 'exposure',
            header: 'Exposure',
            cell: (client) => (assetScale ? formatAdminAtomic(client.currentExposureAtomic, assetScale) : '—'),
          },
          {
            key: 'vaults',
            header: 'Vaults',
            hideBelow: 'md',
            cell: (client) => (client.vaultIds.length === 0 ? '—' : String(client.vaultIds.length)),
          },
          {
            key: 'kyc',
            header: 'KYC',
            cell: (client) => (
              <ToneMark tone={toneForKycStatus(client.kycStatus)} label={kycStatusLabel(client.kycStatus)} />
            ),
          },
        ]}
      />
    </div>
  )
}
