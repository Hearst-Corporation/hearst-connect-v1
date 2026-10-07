'use client'

import type { Field, Section } from '@/lib/settings/schema'
import { useState, useTransition } from 'react'
import { requestChange } from './actions'
import { formatValue, type Row } from './format'

/**
 * UNE SECTION DE RÉGLAGES — lue, puis modifiée.
 *
 * Lecture d'abord : chaque valeur, telle qu'elle s'applique aujourd'hui.
 * « Edit » ouvre la même grille en saisie ; « Request change » n'applique
 * rien : la demande part en approbation, avec sa raison. Une seule demande en
 * attente par section — on décide la première avant d'en ouvrir une seconde.
 */

const INPUT =
  'w-full min-w-0 rounded-lg border border-[var(--ud-line)] bg-[var(--ud-inset)] px-3 py-2 text-sm text-fg placeholder:text-fg-tertiary focus:border-[var(--hearst-green)] focus:outline-none'

const isNumeric = (t: Field['type']) => ['number', 'usd', 'bps', 'btc', 'hours', 'months'].includes(t)

function FieldInput({ field, value, onChange }: Readonly<{ field: Field; value: unknown; onChange: (v: unknown) => void }>) {
  switch (field.type) {
    case 'readonly':
      return <span className="text-sm text-fg">{String(value ?? '—')}</span>
    case 'bool':
      return (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(!value)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? 'bg-[var(--hearst-green)]' : 'bg-white/15'}`}
        >
          <span className={`absolute top-0.5 size-5 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      )
    case 'select':
      return (
        <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={INPUT}>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'tags': {
      const list = Array.isArray(value) ? (value as string[]) : []
      if (field.options) {
        return (
          <div className="flex flex-wrap gap-1.5">
            {field.options.map((o) => {
              const on = list.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => onChange(on ? list.filter((x) => x !== o) : [...list, o])}
                  className={`rounded-full px-2.5 py-1 text-xs ring-1 ${on ? 'bg-[var(--hearst-green)]/15 text-[var(--hearst-green)] ring-[var(--hearst-green)]/40' : 'text-fg-tertiary ring-[var(--ud-line)]'}`}
                >
                  {o}
                </button>
              )
            })}
          </div>
        )
      }
      return (
        <input
          className={INPUT}
          defaultValue={list.join(', ')}
          placeholder="Comma-separated"
          onChange={(e) => onChange(e.target.value.split(',').map((x) => x.trim()).filter(Boolean))}
        />
      )
    }
    case 'textarea':
      return <textarea className={`${INPUT} min-h-[72px]`} value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} />
    default:
      if (isNumeric(field.type)) {
        const shown = field.type === 'bps' ? (value === null || value === undefined ? '' : Number(value) / 100) : (value ?? '')
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              className={`${INPUT} tabular-nums`}
              value={String(shown)}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') return onChange(null)
                const n = Number(raw)
                onChange(field.type === 'bps' ? Math.round(n * 100) : n)
              }}
            />
            <span className="shrink-0 text-xs text-fg-tertiary">
              {{ usd: 'USD', bps: '%', btc: 'BTC', hours: 'h', months: 'mo', number: '' }[field.type as string] ?? ''}
            </span>
          </div>
        )
      }
      return (
        <input
          className={`${INPUT} ${field.type === 'address' ? 'font-mono text-xs' : ''}`}
          type={field.type === 'email' ? 'email' : 'text'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export function SectionPanel({
  section,
  value,
  locked,
  approverLine,
}: Readonly<{
  section: Section
  value: unknown
  /** Une demande attend déjà sur cette section : pas de seconde avant qu'elle soit décidée. */
  locked: boolean
  approverLine: string
}>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<unknown>(value)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(value ?? (section.kind === 'list' ? [] : {}))))
    setReason('')
    setError(null)
    setSent(false)
    setEditing(true)
  }
  const submit = () => {
    setError(null)
    start(async () => {
      const out = await requestChange(section.id, draft, reason.trim())
      if (!out.ok) return setError(out.error)
      setEditing(false)
      setSent(true)
    })
  }

  const rows = (section.kind === 'list' ? (editing ? draft : value) : []) as Row[]
  const obj = (section.kind === 'object' ? (editing ? draft : value) : {}) as Row
  const setObj = (key: string, v: unknown) => setDraft({ ...(draft as Row), [key]: v })
  const setRow = (i: number, key: string, v: unknown) =>
    setDraft((draft as Row[]).map((r, j) => (j === i ? { ...r, [key]: v } : r)))

  return (
    <div className="flex flex-col gap-5">
      {section.kind === 'object' ? (
        <dl className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
          {section.fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 border-b border-[var(--ud-line)] py-3">
              <dt className="flex min-w-0 flex-col">
                <span className="text-sm text-fg-secondary">{f.label}</span>
                {f.help ? <span className="text-[11px] text-fg-tertiary">{f.help}</span> : null}
              </dt>
              <dd className="flex min-w-0 max-w-[60%] justify-end text-right text-sm text-fg">
                {editing ? <FieldInput field={f} value={obj[f.key]} onChange={(v) => setObj(f.key, v)} /> : formatValue(f, obj[f.key])}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="overflow-x-auto">
          <table data-no-labels className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.08em] text-fg-tertiary uppercase">
                {section.fields.map((f) => (
                  <th key={f.key} className={`px-3 py-2 font-medium ${f.wide ? 'min-w-[14rem]' : ''}`} title={f.help}>
                    {f.label}
                  </th>
                ))}
                {editing && !section.fixedRows ? <th className="w-10" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ud-line)]">
              {rows.map((r, i) => (
                <tr key={String(r.id ?? i)} className="align-middle">
                  {section.fields.map((f) => (
                    <td key={f.key} className={`px-3 py-2.5 ${f.type === 'address' && !editing ? 'font-mono text-xs' : ''} ${f.wide ? 'break-all' : ''}`}>
                      {editing ? <FieldInput field={f} value={r[f.key]} onChange={(v) => setRow(i, f.key, v)} /> : formatValue(f, r[f.key])}
                    </td>
                  ))}
                  {editing && !section.fixedRows ? (
                    <td className="px-2 text-right">
                      <button
                        type="button"
                        aria-label="Remove this row"
                        onClick={() => setDraft((draft as Row[]).filter((_, j) => j !== i))}
                        className="text-lg text-fg-tertiary hover:text-red-400"
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={section.fields.length} className="px-3 py-6 text-center text-fg-tertiary">
                    Nothing yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {editing && !section.fixedRows ? (
            <button
              type="button"
              onClick={() =>
                setDraft([
                  ...(draft as Row[]),
                  Object.fromEntries([
                    ['id', `new_${Date.now().toString(36)}`],
                    ...section.fields.map((f) => [f.key, f.type === 'tags' ? [] : f.type === 'bool' ? false : f.options?.[0] ?? '']),
                  ]),
                ])
              }
              className="mt-3 text-sm text-[var(--hearst-green)] hover:underline"
            >
              + Add a row
            </button>
          ) : null}
        </div>
      )}

      {/* Le pied : la règle qui gouverne la section, puis l'action. */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[var(--ud-line)] pt-4">
        <p className="max-w-xl text-xs text-fg-tertiary">
          {approverLine} {section.governanceNote}
        </p>
        {editing ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[26rem]">
            <input
              className={INPUT}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this change? (shown to the approver)"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={pending || reason.trim() === ''}
                onClick={submit}
                className="ud-cta inline-flex h-9 items-center disabled:opacity-40"
              >
                {pending ? 'Requesting…' : 'Request change'}
              </button>
            </div>
            {error ? <p className="text-xs text-amber-300">{error}</p> : null}
          </div>
        ) : locked ? (
          <span className="text-xs text-amber-300">A change is waiting for approval — decide it before editing again.</span>
        ) : (
          <div className="flex items-center gap-3">
            {sent ? <span className="text-xs text-[var(--hearst-green)]">Change requested — it now waits for approval.</span> : null}
            <button type="button" onClick={startEdit} className="ud-cta inline-flex h-9 items-center">
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
