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

/** Les @font-face de la page : le PDF reprend FK Grotesk, la fonte de l'app. */
function fontFaces(): string {
  const out: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) if (rule instanceof CSSFontFaceRule) out.push(rule.cssText)
    } catch {
      // Feuille d'une autre origine : illisible, on s'en passe.
    }
  }
  return out.join('\n')
}

/**
 * PDF : une page imprimable aux couleurs de Hearst, que le navigateur
 * enregistre en PDF. Bandeau sombre et logo Hearst Connect en tête, en-têtes de
 * colonnes en vert de marque, FK Grotesk, pied de page confidentiel.
 */
function printPdf(x: TableExport) {
  const w = window.open('', '_blank')
  if (w === null) return
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  const family = getComputedStyle(document.body).fontFamily
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${location.origin}/"><title>${esc(x.filename)}</title>
<style>
  ${fontFaces()}
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; font: 10.5px/1.45 ${family}, -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #121512; }
  .band { display: flex; align-items: center; justify-content: space-between; padding: 18px 14mm; background: #0d100d; }
  .band img { height: 26px; }
  .band .meta { text-align: right; color: #9aa39a; font-size: 9px; letter-spacing: .04em; }
  .band .meta b { display: block; color: #fff; font-size: 10px; font-weight: 500; letter-spacing: 0; }
  .rule { height: 3px; background: #a7fb90; }
  main { padding: 10mm 14mm 18mm; }
  h1 { margin: 0 0 2px; font-size: 20px; font-weight: 500; letter-spacing: -.01em; }
  .sub { margin: 0 0 16px; color: #6b736b; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; }
  th { text-align: left; font-size: 8.5px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase; color: #a7fb90; background: #0d100d; padding: 8px 10px; }
  th:first-child { border-radius: 6px 0 0 6px; }
  th:last-child { border-radius: 0 6px 6px 0; }
  td { padding: 7px 10px; border-bottom: 1px solid #e6eae4; font-variant-numeric: tabular-nums; }
  tbody tr:nth-child(even) td { background: #f5f8f3; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }
  footer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; padding: 8px 14mm; border-top: 1px solid #e6eae4; color: #8a928a; font-size: 8.5px; background: #fff; }
  footer span:first-child::before { content: ''; display: inline-block; width: 6px; height: 6px; margin-right: 6px; border-radius: 50%; background: #a7fb90; }
</style></head><body>
<div class="band"><img src="/brand/hearst-connect.svg" alt="Hearst Connect"><div class="meta"><b>${esc(x.title)}</b>Generated ${esc(generated)}</div></div>
<div class="rule"></div>
<main>
<h1>${esc(x.title)}</h1><p class="sub">${x.data.length} rows · Hearst Connect</p>
<table><thead><tr>${x.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
<tbody>${x.data.map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
</main>
<footer><span>Hearst Connect · Confidential</span><span>hearstcorporation.io</span></footer>
</body></html>`)
  w.document.close()
  w.focus()
  // Le logo et la fonte doivent être chargés avant l'impression.
  const go = () => setTimeout(() => w.print(), 150)
  if (w.document.fonts?.ready) void w.document.fonts.ready.then(() => (w.document.readyState === 'complete' ? go() : w.addEventListener('load', go)))
  else setTimeout(() => w.print(), 600)
}

/** Le bouton SECONDAIRE de la console : gris, contour fin. Le vert reste aux actions. */
export const SECONDARY_BUTTON =
  'inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5'

/** Le bouton PRIMAIRE de la console : aplat vert, encre sombre. */
export const PRIMARY_BUTTON =
  'inline-flex h-9 items-center rounded-full bg-[var(--hearst-green)] px-4 text-[13px] font-medium text-[var(--hearst-green-ink)] hover:brightness-105'

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
        {/* Le bouton VERT, comme « Show all » des mouvements de /account. Absent
            quand toutes les lignes sont déjà là : un bouton qui ne fait rien
            se lit comme une panne. */}
        {foldable ? (
          <button type="button" className={PRIMARY_BUTTON} onClick={onToggle}>
            {expanded ? 'Show less' : `Show all ${total} ${noun}`}
          </button>
        ) : null}
      </span>
    </div>
  )
}
