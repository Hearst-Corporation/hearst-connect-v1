'use client'

import type { AuditEntry } from '@/lib/settings/schema'
import { useMemo, useState } from 'react'
import { AUDIT_TONE, AuditList } from './audit-list'

/** Le journal complet : filtré par famille, cherché par texte, exporté en CSV pour un auditeur. */
export function AuditExplorer({ entries }: Readonly<{ entries: readonly AuditEntry[] }>) {
  const [category, setCategory] = useState<AuditEntry['category'] | 'all'>('all')
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter(
      (e) =>
        (category === 'all' || e.category === category) &&
        (needle === '' || `${e.actor} ${e.action} ${e.target} ${e.detail ?? ''}`.toLowerCase().includes(needle)),
    )
  }, [entries, category, q])

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const csv = [
      'at,category,actor,action,target,detail',
      ...shown.map((e) => [e.at, e.category, e.actor, e.action, e.target, e.detail ?? ''].map((v) => esc(String(v))).join(',')),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `hearst-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cats = Object.keys(AUDIT_TONE) as AuditEntry['category'][]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['all', ...cats] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs ring-1 ${
              category === c ? 'bg-white/[0.08] text-fg ring-white/20' : 'text-fg-tertiary ring-[var(--ud-line)] hover:text-fg'
            }`}
          >
            {c === 'all' ? 'All' : AUDIT_TONE[c].label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search who, what, which client…"
          className="ml-auto h-8 w-full rounded-full bg-[var(--ud-inset)] px-4 text-xs text-fg ring-1 ring-[var(--ud-line)] outline-none sm:w-64"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
        >
          Export CSV
        </button>
      </div>
      <p className="text-xs text-fg-tertiary">
        {shown.length} event{shown.length === 1 ? '' : 's'}
      </p>
      <AuditList entries={shown} />
    </div>
  )
}
