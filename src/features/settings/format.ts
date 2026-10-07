import type { Field, Section } from '@/lib/settings/schema'

/** Une valeur de réglage, telle qu'on la lit — jamais un `undefined` ou un `[object Object]`. */
export function formatValue(field: Field, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  switch (field.type) {
    case 'usd':
      return `$${Number(value).toLocaleString('en-US')}`
    case 'bps':
      return `${(Number(value) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} %`
    case 'btc':
      return `${Number(value).toLocaleString('en-US', { maximumFractionDigits: 8 })} BTC`
    case 'hours':
      return `${value} h`
    case 'months':
      return `${value} months`
    case 'bool':
      return value ? 'On' : 'Off'
    case 'tags':
      return Array.isArray(value) && value.length > 0 ? value.join(', ') : '—'
    default:
      return String(value)
  }
}

export type Row = Record<string, unknown> & { id?: string }

export type DiffLine = Readonly<{ kind: 'added' | 'removed' | 'changed'; label: string; fields: readonly Readonly<{ label: string; before: string; after: string }>[] }>

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/** Ce qu'un changement modifie, champ par champ — ce que l'approbateur lit avant de signer. */
export function diffOf(section: Section, before: unknown, after: unknown): readonly DiffLine[] {
  const editable = section.fields
  if (section.kind === 'object') {
    const b = (before ?? {}) as Row
    const a = (after ?? {}) as Row
    const fields = editable
      .filter((f) => !same(b[f.key], a[f.key]))
      .map((f) => ({ label: f.label, before: formatValue(f, b[f.key]), after: formatValue(f, a[f.key]) }))
    return fields.length > 0 ? [{ kind: 'changed', label: section.title, fields }] : []
  }
  const bRows = (Array.isArray(before) ? before : []) as Row[]
  const aRows = (Array.isArray(after) ? after : []) as Row[]
  const key = (r: Row, i: number) => String(r.id ?? i)
  const title = (r: Row) => String(r[editable[0].key] ?? r.label ?? r.id ?? 'Row')
  const lines: DiffLine[] = []
  aRows.forEach((r, i) => {
    const prev = bRows.find((x, j) => key(x, j) === key(r, i))
    if (!prev) {
      lines.push({ kind: 'added', label: title(r), fields: editable.map((f) => ({ label: f.label, before: '—', after: formatValue(f, r[f.key]) })) })
      return
    }
    const fields = editable
      .filter((f) => !same(prev[f.key], r[f.key]))
      .map((f) => ({ label: f.label, before: formatValue(f, prev[f.key]), after: formatValue(f, r[f.key]) }))
    if (fields.length > 0) lines.push({ kind: 'changed', label: title(r), fields })
  })
  bRows.forEach((r, j) => {
    if (!aRows.some((x, i) => key(x, i) === key(r, j))) lines.push({ kind: 'removed', label: title(r), fields: [] })
  })
  return lines
}
