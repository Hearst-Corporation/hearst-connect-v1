'use client'

import { formatBtcValue } from '@/lib/admin-dashboard/amounts'
import { Badge } from '@/components/catalyst/badge'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import { formatDate, formatNumber } from '@/lib/format'
import { useState } from 'react'
import { Pager, TableFooter } from '@/components/admin/paginated-table'
import type { Machine } from './fleet-machines'

/**
 * La liste des machines, sans défilement interne.
 *
 * Un tableau qui défile dans sa carte faisait glisser ses lignes sous son
 * propre en-tête, et 300 machines n'y tiendraient jamais. Repliée, elle montre
 * les cinq premières — les machines hors ligne remontent en tête, ce sont
 * elles qu'on vient chercher. Dépliée, elle se pagine par vingt.
 */

const COLLAPSED = 5
const PAGE = 20

export function FleetMachineTable({
  machines,
  exportName,
  exportTitle,
}: Readonly<{ machines: readonly Machine[]; exportName?: string; exportTitle?: string }>) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const pages = Math.max(1, Math.ceil(machines.length / PAGE))
  const rows = expanded ? machines.slice(page * PAGE, page * PAGE + PAGE) : machines.slice(0, COLLAPSED)
  const from = expanded ? page * PAGE + 1 : 1
  const to = expanded ? Math.min(machines.length, page * PAGE + PAGE) : Math.min(machines.length, COLLAPSED)

  return (
    <div className="flex flex-col gap-4">
      <AdminTable className="[&_table]:w-full [&_table]:min-w-[56rem]">
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Machine</TableHeader>
            <TableHeader>Site</TableHeader>
            <TableHeader className={tableCol.date}>Online since</TableHeader>
            <TableHeader className={tableCol.numeric}>Hashrate</TableHeader>
            <TableHeader className={tableCol.numeric}>Efficiency</TableHeader>
            <TableHeader>Uptime 30d</TableHeader>
            <TableHeader className={tableCol.numeric}>BTC 30d</TableHeader>
            <TableHeader className={tableCol.status}>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell className={tableCol.primary}>
                <div className="font-medium text-fg">{m.id}</div>
                <div className="text-xs text-fg-tertiary">{m.model}</div>
              </TableCell>
              <TableCell>
                <div className="text-fg">{m.site}</div>
                <div className="text-xs text-fg-tertiary">{m.country}</div>
              </TableCell>
              <TableCell className={tableCol.date}>{formatDate(m.pluggedAt)}</TableCell>
              <TableCell className={tableCol.numeric}>
                {m.hashrateThs > 0 ? `${formatNumber(m.hashrateThs, { maximumFractionDigits: 0 })} TH/s` : '—'}
              </TableCell>
              <TableCell className={`${tableCol.numeric} text-fg-tertiary`}>
                {m.efficiencyJth !== null ? `${formatNumber(m.efficiencyJth, { maximumFractionDigits: 1 })} J/TH` : '—'}
              </TableCell>
              <TableCell>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-16 rounded-full bg-[var(--ud-inset)]">
                    <span
                      className={`block h-full rounded-full ${m.uptime30dPct >= 95 ? 'bg-[var(--hearst-green)]' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, m.uptime30dPct)}%` }}
                    />
                  </span>
                  <span className="text-xs tabular-nums text-fg-secondary">
                    {formatNumber(m.uptime30dPct, { maximumFractionDigits: 1 })} %
                  </span>
                </span>
              </TableCell>
              <TableCell className={tableCol.numeric}>{formatBtcValue(m.btcProduced30d)}</TableCell>
              <TableCell className={tableCol.status}>
                <Badge color={m.status === 'online' ? 'lime' : 'red'}>{m.status === 'online' ? 'Online' : 'Offline'}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdminTable>

      <TableFooter
        from={from - 1}
        to={to}
        total={machines.length}
        noun="machines"
        expanded={expanded}
        foldable={machines.length > COLLAPSED}
        onToggle={() => {
          setExpanded((e) => !e)
          setPage(0)
        }}
        pager={
          expanded && pages > 1 ? (
            <Pager page={page} pages={pages} onPage={(p) => setPage(Math.min(pages - 1, Math.max(0, p)))} />
          ) : null
        }
        exportData={{
          filename: exportName ?? 'hearst-machines',
          title: exportTitle ?? 'Fleet machines',
          columns: ['Machine', 'Model', 'Site', 'Country', 'Online since', 'Hashrate (TH/s)', 'Efficiency (J/TH)', 'Uptime 30d (%)', 'BTC 30d', 'Status'],
          data: machines.map((m) => [
            m.id,
            m.model,
            m.site,
            m.country,
            m.pluggedAt.slice(0, 10),
            m.hashrateThs,
            m.efficiencyJth,
            m.uptime30dPct,
            m.btcProduced30d,
            m.status,
          ]),
        }}
      />
    </div>
  )
}
