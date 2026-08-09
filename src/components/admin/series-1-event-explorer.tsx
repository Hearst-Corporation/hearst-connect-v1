'use client'

import { Field, FieldGroup, Label } from '@/components/catalyst/fieldset'
import { Input } from '@/components/catalyst/input'
import { Select } from '@/components/catalyst/select'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { DataTableShell, fitTableColCompact, fitTableColPrimary } from '@/components/compositions'
import { formatNumber } from '@/lib/format'
import { dateLisible, ilYA, libelleMouvement } from '@/lib/mouvements'
import { useMemo, useState } from 'react'

export type Series1EventRow = Readonly<{
  id: string
  eventName: string
  vaultId: string | null
  client: string | null
  amount: string | null
  assetLabel: string | null
  txHash: string | null
  blockNumber: string | null
  occurredAt: string | null
  indexedAt: string | null
}>

type Filters = Readonly<{
  event: string
  vault: string
  client: string
  amountAsset: string
  tx: string
  block: string
  timeStatus: string
}>

const EMPTY_FILTERS: Filters = {
  event: '',
  vault: '',
  client: '',
  amountAsset: '',
  tx: '',
  block: '',
  timeStatus: '',
}

function statusLabel(row: Series1EventRow): string {
  if (row.indexedAt !== null && row.indexedAt !== '') return 'Indexed'
  if (row.occurredAt !== null && row.occurredAt !== '') return 'On-chain time'
  return 'Pending index'
}

function matchesQuery(value: string | null | undefined, query: string): boolean {
  if (query === '') return true
  if (value === null || value === undefined || value === '') return false
  return value.toLowerCase().includes(query.toLowerCase())
}

function rowMatches(row: Series1EventRow, filters: Filters): boolean {
  if (filters.event !== '' && row.eventName !== filters.event) return false
  if (!matchesQuery(row.vaultId, filters.vault)) return false
  if (!matchesQuery(row.client, filters.client)) return false
  if (filters.amountAsset !== '') {
    const haystack = [row.amount, row.assetLabel].filter(Boolean).join(' ').toLowerCase()
    if (!haystack.includes(filters.amountAsset.toLowerCase())) return false
  }
  if (!matchesQuery(row.txHash, filters.tx)) return false
  if (!matchesQuery(row.blockNumber, filters.block)) return false
  if (filters.timeStatus !== '') {
    const haystack = [statusLabel(row), row.occurredAt, row.indexedAt, dateLisible(row.occurredAt), ilYA(row.occurredAt)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(filters.timeStatus.toLowerCase())) return false
  }
  return true
}

function txShort(hash: string | null): string | null {
  if (hash === null || hash === '') return null
  if (hash.length <= 14) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export function Series1EventExplorer({
  rows,
  calme,
}: Readonly<{
  rows: readonly Series1EventRow[]
  calme?: string
}>) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const eventOptions = useMemo(() => {
    const names = new Set(rows.map((row) => row.eventName))
    return [...names].sort((a, b) => libelleMouvement(a).localeCompare(libelleMouvement(b)))
  }, [rows])

  const filtered = useMemo(() => rows.filter((row) => rowMatches(row, filters)), [rows, filters])

  const count =
    filtered.length > 0
      ? `${formatNumber(filtered.length)} event${filtered.length === 1 ? '' : 's'}`
      : rows.length === 0
        ? undefined
        : '0 events'

  return (
    <div className="space-y-4">
      <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <Label>Event</Label>
          <Select
            value={filters.event}
            onChange={(e) => setFilters((prev) => ({ ...prev, event: e.target.value }))}
          >
            <option value="">All events</option>
            {eventOptions.map((name) => (
              <option key={name} value={name}>
                {libelleMouvement(name)}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>Vault</Label>
          <Input
            placeholder="Vault id"
            value={filters.vault}
            onChange={(e) => setFilters((prev) => ({ ...prev, vault: e.target.value }))}
          />
        </Field>
        <Field>
          <Label>Client</Label>
          <Input
            placeholder="Investor address"
            value={filters.client}
            onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
          />
        </Field>
        <Field>
          <Label>Amount / asset</Label>
          <Input
            placeholder="Amount or asset"
            value={filters.amountAsset}
            onChange={(e) => setFilters((prev) => ({ ...prev, amountAsset: e.target.value }))}
          />
        </Field>
        <Field>
          <Label>Transaction</Label>
          <Input
            placeholder="Tx hash"
            value={filters.tx}
            onChange={(e) => setFilters((prev) => ({ ...prev, tx: e.target.value }))}
          />
        </Field>
        <Field>
          <Label>Block</Label>
          <Input
            placeholder="Block number"
            value={filters.block}
            onChange={(e) => setFilters((prev) => ({ ...prev, block: e.target.value }))}
          />
        </Field>
        <Field className="sm:col-span-2">
          <Label>Time / status</Label>
          <Input
            placeholder="Occurred, indexed, or status"
            value={filters.timeStatus}
            onChange={(e) => setFilters((prev) => ({ ...prev, timeStatus: e.target.value }))}
          />
        </Field>
      </FieldGroup>

      <DataTableShell
        fit
        title="Event explorer"
        description="Filter indexed Series 1 events. Vault, client, and block live in the row title / event detail."
        count={count}
        calme={
          calme ??
          (rows.length > 0 && filtered.length === 0
            ? 'No events match the current filters.'
            : undefined)
        }
      >
        {filtered.length > 0 ? (
          <>
            <TableHead>
              <TableRow>
                <TableHeader className={fitTableColPrimary}>Event</TableHeader>
                <TableHeader className={fitTableColCompact}>Amount</TableHeader>
                <TableHeader className={fitTableColPrimary}>Transaction</TableHeader>
                <TableHeader className={fitTableColCompact}>When</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => {
                const tx = txShort(row.txHash)
                const detailBits = [
                  row.vaultId !== null ? `Vault ${row.vaultId}` : null,
                  row.client !== null ? `Client ${row.client}` : null,
                  row.blockNumber !== null && row.blockNumber !== ''
                    ? `Block ${formatNumber(Number(row.blockNumber))}`
                    : null,
                ].filter(Boolean)
                return (
                  <TableRow key={row.id} title={detailBits.join(' · ') || undefined}>
                    <TableCell className="truncate font-medium">{libelleMouvement(row.eventName)}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.amount !== null ? (
                        <>
                          {row.amount}
                          {row.assetLabel !== null ? (
                            <span className="ml-1 text-fg-tertiary">{row.assetLabel}</span>
                          ) : null}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="truncate font-mono text-sm" title={row.txHash ?? undefined}>
                      {tx ?? '—'}
                    </TableCell>
                    <TableCell title={dateLisible(row.occurredAt)}>
                      <span className="block tabular-nums">{ilYA(row.occurredAt)}</span>
                      <span className="text-fg-tertiary text-xs">{statusLabel(row)}</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </>
        ) : null}
      </DataTableShell>
    </div>
  )
}
