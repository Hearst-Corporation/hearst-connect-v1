'use client'

import { CLIENT_VIEW_PATH, type View } from './views'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { SegSelect } from '@/components/admin/seg-select'
import { Badge } from '@/components/catalyst/badge'
import { Input } from '@/components/catalyst/input'
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
  owner: string | null
}>


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

export function ClientBookTable({ rows, initialView = 'all' }: Readonly<{ rows: readonly ClientRow[]; initialView?: View }>) {
  const params = useSearchParams()
  const [view, setViewState] = useState<View>(initialView)
  // Changer de vue met l'adresse à jour, sans recharger : on la partage telle quelle.
  const setView = (v: View) => {
    setViewState(v)
    window.history.replaceState(null, '', CLIENT_VIEW_PATH[v])
  }
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
        <SegSelect
          label="Client view"
          value={view}
          options={VIEWS.map((v) => ({ value: v.id, label: `${v.label} (${counts[v.id]})` }))}
          onChange={setView}
        />
        <div className="ud-seg seg-collapsible" role="group" aria-label="Client view">
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
        /* Un tableau dense, une ligne par client : à 200 clients, une carte
           chacun ferait 80 000 px. Il défile en largeur sur petit écran au lieu
           de se replier en cartes. */
        <div data-no-labels className="min-w-0">
        <PaginatedTable
          className="[&_table]:w-full [&_table]:min-w-[52rem] [&_td]:px-4 [&_th]:px-4 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0"
          noun="clients"
          collapsed={25}
          head={
            <TableRow>
              <TableHeader className={tableCol.primary}>Client</TableHeader>
              <TableHeader className={tableCol.status}>Stage</TableHeader>
              <TableHeader className={tableCol.numeric}>Reserve · offer</TableHeader>
              <TableHeader>Vault · drift</TableHeader>
              <TableHeader>Next action</TableHeader>
            </TableRow>
          }
          rows={filtered.map((r) => (
              /* Toute la ligne ouvre la fiche (survol, curseur, ⌘-clic, clavier) :
                 le nom n'a plus besoin d'être souligné pour se lire comme un lien. */
              <TableRow key={r.clientId} href={r.href} title={`Open ${r.name}`} className="group cursor-pointer transition-colors hover:bg-white/[0.035]">
                <TableCell className={tableCol.primary}>
                  <span className="block truncate font-medium text-fg">{r.name}</span>
                  <div className="text-xs text-fg-tertiary">
                    {r.kind ?? 'Kind not recorded'}
                    {/* Qui suit ce client : la personne à qui demander. */}
                    {r.owner ? <span className="text-fg-secondary"> · {r.owner}</span> : null}
                  </div>
                </TableCell>
                <TableCell className={tableCol.status}>
                  <div className="flex flex-col items-start gap-1">
                    <Badge color={STAGE_TONE[r.stage] ?? 'neutral'}>{r.stageLabel}</Badge>
                    {/* Le KYC ne se montre que s'il reste quelque chose à faire. */}
                    {r.kycTone !== 'lime' ? <span className="text-[11px] text-fg-tertiary">KYC · {r.kycLabel}</span> : null}
                  </div>
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
                    <span className="flex items-center gap-2 pr-6 text-sm">
                      <span
                        className={`size-2 shrink-0 rounded-full ${r.onUs ? 'bg-[var(--hearst-green)]' : 'bg-[var(--ud-fg-3)]'}`}
                        aria-hidden="true"
                      />
                      <span className={r.onUs ? 'text-fg' : 'text-fg-tertiary'}>{r.nextAction}</span>
                    </span>
                  ) : (
                    <span className="text-fg-tertiary">—</span>
                  )}
                  {/* La flèche n'apparaît qu'au survol : elle dit « ça s'ouvre » sans charger la ligne. */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    →
                  </span>
                </TableCell>
              </TableRow>
            ))}
          exportData={{
            filename: 'hearst-clients',
            title: 'Clients',
            columns: ['Client', 'Kind', 'Stage', 'Deposit or offer (USDC)', 'Reserve (BTC)', 'Accumulated (BTC)', 'KYC', 'Vault', 'Term', 'Next action', 'Owner'],
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
              r.owner,
            ]),
          }}
        />
        </div>
      )}
      <p className="flex items-center gap-2 text-xs text-fg-tertiary">
        <span className="size-2 rounded-full bg-[var(--hearst-green)]" aria-hidden="true" /> the next move is ours
        <span className="ml-3 size-2 rounded-full bg-[var(--ud-fg-3)]" aria-hidden="true" /> waiting on the client or a partner
      </p>
    </div>
  )
}
