'use client'

import { TableBody, TableHead } from '@/components/catalyst/table'
import { AdminTable } from '@/components/compositions'
import { useState, type ReactNode } from 'react'

/**
 * Les numéros de page à montrer : la première, la dernière, et deux de part et
 * d'autre de la page courante — `null` marque un saut (« … »). Cinq cents pages
 * ne tiennent pas dans une barre.
 */
export function pageWindow(page: number, pages: number): readonly (number | null)[] {
  const keep = new Set([0, pages - 1, page - 2, page - 1, page, page + 1, page + 2])
  const out: (number | null)[] = []
  for (let i = 0; i < pages; i++) {
    if (!keep.has(i)) continue
    if (out.length > 0 && out[out.length - 1] !== null && (out[out.length - 1] as number) < i - 1) out.push(null)
    out.push(i)
  }
  return out
}

/** Ce qu'un tableau exporte : des valeurs brutes, pas des cellules mises en forme. */
export type TableExport = Readonly<{
  /** Nom du fichier, sans extension. */
  filename: string
  /** Titre du PDF. */
  title: string
  columns: readonly string[]
  data: readonly (readonly (string | number | null)[])[]
}>

const csvCell = (v: string | number | null) => {
  if (v === null) return ''
  const s = String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV avec BOM : Excel l'ouvre avec ses accents et ses colonnes. */
function downloadCsv(x: TableExport) {
  const lines = [x.columns, ...x.data].map((r) => r.map(csvCell).join(','))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${x.filename}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const esc = (v: string | number | null) =>
  v === null ? '' : String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** PDF : une page imprimable, sobre, que le navigateur enregistre en PDF. */
function printPdf(x: TableExport) {
  const w = window.open('', '_blank')
  if (w === null) return
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(x.filename)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm; }
  body { font: 11px/1.4 -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111; }
  h1 { font-size: 16px; margin: 0 0 2px; }
  p { margin: 0 0 14px; color: #666; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; color: #555; background: #f1f1ee; padding: 7px 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e5e0; font-variant-numeric: tabular-nums; }
</style></head><body>
<h1>${esc(x.title)}</h1><p>Hearst Connect · ${x.data.length} rows · generated ${esc(generated)}</p>
<table><thead><tr>${x.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
<tbody>${x.data.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}

/** Le bouton SECONDAIRE de la console : gris, contour fin. Le vert reste aux actions. */
export const SECONDARY_BUTTON =
  'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5'

/** Les deux exports, au même gabarit partout. */
export function ExportButtons({ data }: Readonly<{ data: TableExport }>) {
  const btn = SECONDARY_BUTTON
  return (
    <span className="flex items-center gap-2">
      <button type="button" className={btn} onClick={() => downloadCsv(data)}>
        Export Excel
      </button>
      <button type="button" className={btn} onClick={() => printPdf(data)}>
        Export PDF
      </button>
    </span>
  )
}

/** La pagination, dans le sélecteur blanc de la console. */
export function Pager({
  page,
  pages,
  onPage,
}: Readonly<{ page: number; pages: number; onPage: (p: number) => void }>) {
  return (
    <nav className="ud-seg" aria-label="Pages">
      <button type="button" className="ud-seg-btn" disabled={page === 0} onClick={() => onPage(page - 1)}>
        ← Previous
      </button>
      {pageWindow(page, pages).map((i, k) =>
        i === null ? (
          <span key={`gap-${k}`} className="ud-seg-btn pointer-events-none">
            …
          </span>
        ) : (
          <button
            key={i}
            type="button"
            aria-current={i === page ? 'page' : undefined}
            className={`ud-seg-btn${i === page ? ' active' : ''}`}
            onClick={() => onPage(i)}
          >
            {i + 1}
          </button>
        ),
      )}
      <button type="button" className="ud-seg-btn" disabled={page === pages - 1} onClick={() => onPage(page + 1)}>
        Next →
      </button>
    </nav>
  )
}

/**
 * LE tableau de données de la console — un seul comportement partout.
 *
 * Replié, il montre les premières lignes ; « Show all » le déplie et le pagine
 * par vingt ; « Show less » le replie. Il ne défile jamais dans sa carte. Deux
 * exports pour la comptabilité : Excel (CSV) et PDF, sur TOUTES les lignes,
 * pas seulement la page affichée.
 *
 * Les lignes arrivent déjà rendues par le serveur — ce composant ne fait que
 * choisir lesquelles afficher.
 */
export function PaginatedTable({
  head,
  rows,
  collapsed = 5,
  pageSize = 20,
  noun = 'rows',
  className,
  exportData,
  note,
}: Readonly<{
  /** Une note de lecture, au pied, à gauche — centrée sur la ligne des boutons. */
  note?: ReactNode
  /** La `<TableRow>` d'en-tête. */
  head: ReactNode
  /** Une `<TableRow>` par ligne, dans l'ordre d'affichage. */
  rows: readonly ReactNode[]
  /** Lignes visibles repliées. */
  collapsed?: number
  pageSize?: number
  /** Le mot du décompte : « machines », « distributions »… */
  noun?: string
  className?: string
  exportData?: TableExport
}>) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const from = expanded ? page * pageSize : 0
  const to = Math.min(rows.length, expanded ? from + pageSize : collapsed)

  return (
    <div className="flex flex-col gap-4">
      <AdminTable className={className ?? '[&_table]:w-full'}>
        <TableHead>{head}</TableHead>
        <TableBody>{rows.slice(from, to)}</TableBody>
      </AdminTable>

      {rows.length > 0 ? (
        <TableFooter
          from={from}
          to={to}
          total={rows.length}
          noun={noun}
          expanded={expanded}
          foldable={rows.length > collapsed}
          onToggle={() => {
            setExpanded((e) => !e)
            setPage(0)
          }}
          pager={expanded && pages > 1 ? <Pager page={page} pages={pages} onPage={(p) => setPage(Math.min(pages - 1, Math.max(0, p)))} /> : null}
          exportData={exportData}
          note={note}
        />
      ) : null}
    </div>
  )
}

/** Le pied commun : pagination à gauche ; à droite, les exports puis Show all / Show less.
 *  Pas de décompte « 1–5 of 5 » : le tableau se lit, la phrase n'apprenait rien. */
export function TableFooter({
  total,
  noun,
  expanded,
  foldable,
  onToggle,
  pager,
  exportData,
  note,
}: Readonly<{
  note?: ReactNode
  from?: number
  to?: number
  total: number
  noun: string
  expanded: boolean
  foldable: boolean
  onToggle: () => void
  pager: ReactNode
  exportData?: TableExport
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex min-w-0 flex-1 items-center gap-4">
        {pager}
        {note ? <span className="max-w-3xl text-[11px] leading-relaxed text-fg-tertiary">{note}</span> : null}
      </span>
      {/* À droite même quand la ligne se replie (téléphone) : `ml-auto`. */}
      <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {exportData ? <ExportButtons data={exportData} /> : null}
        {/* Toujours là, au même endroit — un bouton SECONDAIRE, en gris comme les
            exports : déplier un tableau n'est pas une action métier. */}
        <button
          type="button"
          className={`${SECONDARY_BUTTON} ${foldable ? '' : 'cursor-default'}`}
          onClick={foldable ? onToggle : undefined}
        >
          {expanded ? 'Show less' : `Show all ${total} ${noun}`}
        </button>
      </span>
    </div>
  )
}
