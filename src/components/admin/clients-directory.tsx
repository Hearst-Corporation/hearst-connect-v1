'use client'

import { Badge } from '@/components/catalyst/badge'
import { Input } from '@/components/catalyst/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { DataTableShell } from '@/components/compositions'
import type { AdminRecentClient } from '@/lib/admin-dashboard/contracts'
import { formatAdminAtomic, type AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAddress, formatDateTime } from '@/lib/format'
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

function kycBadgeColor(status: string): 'lime' | 'amber' | 'red' | 'neutral' {
  const kyc = kycKey(status)
  if (kyc === 'APPROVED' || kyc === 'VERIFIED') return 'lime'
  if (kyc === 'REJECTED' || kyc === 'DENIED' || kyc === 'HIGH_RISK') return 'red'
  if (
    kyc === 'PENDING' ||
    kyc === 'EN_ATTENTE' ||
    kyc === 'IN_REVIEW' ||
    kyc === 'IN_PROGRESS' ||
    kyc === 'REQUIRED' ||
    kyc === 'EXPIRED'
  ) {
    return 'amber'
  }
  return 'neutral'
}

export function ClientsDirectory({
  clients,
  assetScale,
}: Readonly<{ clients: readonly AdminRecentClient[]; assetScale: AdminAssetScale | null }>) {
  const [query, setQuery] = useState('')
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
    <div className="space-y-4" data-widget="clients-directory">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-sm">
          <label htmlFor="clients-search" className="sr-only">
            Search clients
          </label>
          <Input
            id="clients-search"
            type="search"
            placeholder="Search by name, id, or KYC…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Client filters">
          {FILTERS.map((item) => {
            const active = filter === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={
                  active
                    ? 'rounded-md bg-accent-400 px-2.5 py-1 text-xs font-medium text-accent-ink'
                    : 'rounded-md bg-console-inset px-2.5 py-1 text-xs font-medium text-fg-secondary ring-1 ring-console-line-soft'
                }
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <DataTableShell
        title="Directory"
        description="Partner KYC via Som — read only."
        count={`${filtered.length} of ${clients.length}`}
        calme={filtered.length === 0 ? 'No clients match this search or filter.' : undefined}
      >
        {filtered.length > 0 ? (
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Exposure</TableHeader>
                <TableHeader>Vaults</TableHeader>
                <TableHeader>KYC (Som)</TableHeader>
                <TableHeader>Last activity</TableHeader>
                <TableHeader>Created</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium text-fg">{client.label}</div>
                    <div className="font-mono text-xs text-fg-tertiary">{client.id}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {assetScale
                      ? formatAdminAtomic(client.currentExposureAtomic, assetScale)
                      : '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-tertiary">
                    {client.vaultIds.length > 0
                      ? client.vaultIds
                          .slice(0, 2)
                          .map((id) => formatAddress(id) ?? id)
                          .join(', ')
                      : '—'}
                    {client.vaultIds.length > 2 ? ` +${client.vaultIds.length - 2}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge color={kycBadgeColor(client.kycStatus)}>
                      {kycStatusLabel(client.kycStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-fg-tertiary">
                    {client.lastActivityAt ? formatDateTime(client.lastActivityAt) : '—'}
                  </TableCell>
                  <TableCell className="text-fg-tertiary">{formatDateTime(client.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </DataTableShell>
    </div>
  )
}
