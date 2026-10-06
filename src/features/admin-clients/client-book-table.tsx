'use client'

import { PaginatedTable } from '@/components/admin/paginated-table'
import { Badge } from '@/components/catalyst/badge'
import { Input } from '@/components/catalyst/input'
import { Link } from '@/components/catalyst/link'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { tableCol } from '@/components/compositions'
import { btcFromSats } from '@/lib/admin-dashboard/amounts'
import { formatCurrency } from '@/lib/format'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

/**
 * La liste des clients — une ligne par client, quelle que soit son étape.
 *
 * Les filtres remplacent les anciens menus : « Pipeline » est l'ancien Offers,
 * « Active » l'ancien Vaults, « Waiting on you » la file de travail du jour.
 * Ce ne sont que des vues sur la même liste — un client ne change pas de page
 * en changeant d'étape.
 */

export type ClientRow = Readonly<{
  clientId: string
  href: string
  name: string
  kind: string | null
  stage: string
  stageLabel: string
  amountUsdc: number | null
  /** Vault actif : sa réserve en bitcoin (versement converti + accumulé). */
  reserveBtcSats: number | null
  accruedBtcSats: number | null
  kycLabel: string
  kycTone: 'lime' | 'amber' | 'neutral' | 'red'
  vaultLine: string | null
  vaultTone: 'lime' | 'amber' | 'neutral' | null
  vaultBadge: string | null
  nextAction: string | null
  onUs: boolean
}>

type View = 'all' | 'onUs' | 'pipeline' | 'active' | 'closed'

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'onUs', label: 'Waiting on you' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'active', label: 'Active' },
  { id: 'closed', label: 'Closed' },
]

const STAGE_TONE: Record<string, 'lime' | 'sky' | 'amber' | 'neutral' | 'neutral'> = {
  prospect: 'neutral',
  draft: 'amber',
  sent: 'sky',
  accepted: 'amber',
  funding: 'sky',
  funded: 'amber',
  active: 'lime',
  closed: 'neutral',
}

const usd = (v: number | null) => (v === null ? '—' : formatCurrency(String(v), { unit: '$', fromAtomic: 1 }))

function matches(row: ClientRow, view: View): boolean {
  switch (view) {
    case 'all':
      return true
    case 'onUs':
      return row.onUs
    case 'pipeline':
      return row.stage !== 'active' && row.stage !== 'closed'
    case 'active':
      return row.stage === 'active'
    case 'closed':
      return row.stage === 'closed'
  }
}

export function ClientBookTable({ rows }: Readonly<{ rows: readonly ClientRow[] }>) {
  const params = useSearchParams()
  const initialView = (VIEWS.find((v) => v.id === params.get('view'))?.id ?? 'all') as View
  const [view, setView] = useState<View>(initialView)
  const [query, setQuery] = useState(params.get('q') ?? '')

  const counts = useMemo(
    () => Object.fromEntries(VIEWS.map((v) => [v.id, rows.filter((r) => matches(r, v.id)).length])) as Record<View, number>,
    [rows],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) => matches(r, view) && (q === '' || r.name.toLowerCase().includes(q) || (r.kind ?? '').toLowerCase().includes(q)),
    )
  }, [rows, view, query])

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search clients"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search clients"
          />
        </div>
        <div className="ud-seg" role="group" aria-label="Client view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={`ud-seg-btn${view === v.id ? ' active' : ''}`}
            >
              {v.label}
              <span className={`ml-1.5 tabular-nums ${view === v.id ? 'opacity-60' : 'opacity-50'}`}>{counts[v.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-8 text-center text-sm text-fg-tertiary">
          No client matches this view.
        </p>
      ) : (
        <PaginatedTable
          className="[&_table]:w-full [&_table]:min-w-[56rem] [&_td]:px-4 [&_th]:px-4 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0"
          noun="clients"
          collapsed={10}
          head={
            <TableRow>
              <TableHeader className={tableCol.primary}>Client</TableHeader>
              <TableHeader className={tableCol.status}>Stage</TableHeader>
              <TableHeader className={tableCol.numeric}>Reserve · offer</TableHeader>
              <TableHeader className={tableCol.status}>KYC</TableHeader>
              <TableHeader>Vault · drift</TableHeader>
              <TableHeader>Next action</TableHeader>
              <TableHeader className={tableCol.action}>
                <span className="sr-only">Open</span>
              </TableHeader>
            </TableRow>
          }
          rows={filtered.map((r) => (
              <TableRow key={r.clientId}>
                <TableCell className={tableCol.primary}>
                  <Link href={r.href} className="block truncate font-medium text-fg hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-fg-tertiary">{r.kind ?? 'Kind not recorded'}</div>
                </TableCell>
                <TableCell className={tableCol.status}>
                  <Badge color={STAGE_TONE[r.stage] ?? 'neutral'}>{r.stageLabel}</Badge>
                </TableCell>
                {/* Vault actif : sa réserve de bitcoin. Sinon : le montant de l'offre,
                    le seul chiffre en USDC du parcours. */}
                <TableCell className={tableCol.numeric}>
                  {r.reserveBtcSats !== null ? (
                    <>
                      <div className="font-medium text-fg">{btcFromSats(r.reserveBtcSats)}</div>
                      <div className="text-xs text-fg-tertiary">
                        from {usd(r.amountUsdc)} USDC
                        {r.accruedBtcSats !== null ? (
                          <span className="text-[var(--hearst-green)]"> · +{btcFromSats(r.accruedBtcSats)}</span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-fg">{usd(r.amountUsdc)}</div>
                      <div className="text-xs text-fg-tertiary">{r.amountUsdc !== null ? 'USDC proposed' : ''}</div>
                    </>
                  )}
                </TableCell>
                <TableCell className={tableCol.status}>
                  <Badge color={r.kycTone}>{r.kycLabel}</Badge>
                </TableCell>
                <TableCell>
                  {r.vaultBadge !== null ? (
                    <div className="flex flex-col items-start gap-1">
                      <Badge color={r.vaultTone ?? 'neutral'}>{r.vaultBadge}</Badge>
                      {r.vaultLine ? <span className="text-xs text-fg-tertiary">{r.vaultLine}</span> : null}
                    </div>
                  ) : (
                    <span className="text-fg-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {r.nextAction !== null ? (
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className={`size-2 shrink-0 rounded-full ${r.onUs ? 'bg-[var(--hearst-green)]' : 'bg-[var(--ud-fg-3)]'}`}
                        aria-hidden="true"
                      />
                      <span className={r.onUs ? 'text-fg' : 'text-fg-tertiary'}>{r.nextAction}</span>
                    </span>
                  ) : (
                    <span className="text-fg-tertiary">—</span>
                  )}
                </TableCell>
                <TableCell className={tableCol.action}>
                  <Link href={r.href} className="ud-detail-btn inline-flex items-center no-underline" aria-label={`Open ${r.name}`}>
                    Open
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          exportData={{
            filename: 'hearst-clients',
            title: 'Clients',
            columns: ['Client', 'Kind', 'Stage', 'Deposit or offer (USDC)', 'Reserve (BTC)', 'Accumulated (BTC)', 'KYC', 'Vault', 'Term', 'Next action'],
            data: filtered.map((r) => [
              r.name,
              r.kind,
              r.stageLabel,
              r.amountUsdc,
              r.reserveBtcSats !== null ? r.reserveBtcSats / 1e8 : null,
              r.accruedBtcSats !== null ? r.accruedBtcSats / 1e8 : null,
              r.kycLabel,
              r.vaultBadge,
              r.vaultLine,
              r.nextAction,
            ]),
          }}
        />
      )}
      <p className="flex items-center gap-2 text-xs text-fg-tertiary">
        <span className="size-2 rounded-full bg-[var(--hearst-green)]" aria-hidden="true" /> the next move is ours
        <span className="ml-3 size-2 rounded-full bg-[var(--ud-fg-3)]" aria-hidden="true" /> waiting on the client or a partner
      </p>
    </div>
  )
}
