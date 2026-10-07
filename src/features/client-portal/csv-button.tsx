'use client'

/** Exporter le registre en CSV — pour la comptabilité du client. */
export function CsvButton({ rows, filename }: Readonly<{ rows: readonly (readonly (string | number | null)[])[]; filename: string }>) {
  return (
    <button
      type="button"
      onClick={() => {
        const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const url = URL.createObjectURL(new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' }))
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }}
      className="inline-flex h-8 items-center rounded-full px-3.5 text-xs font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
    >
      Export CSV
    </button>
  )
}
