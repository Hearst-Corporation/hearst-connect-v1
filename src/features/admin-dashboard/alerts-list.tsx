'use client'

import Link from 'next/link'
import { useState } from 'react'

export type AlertKind = 'guardian' | 'integration' | 'drift' | 'lockup' | 'settings'
export type Alert = Readonly<{
  kind: AlertKind
  tone: 'red' | 'amber' | 'sky'
  title: string
  detail: string
  href: string
  /** Hors bande : la dérive mesurée et la bande autorisée, en points. */
  drift?: Readonly<{ pt: number; band: number }>
}>

const DOT: Record<Alert['tone'], string> = { red: 'bg-red-400', amber: 'bg-amber-300', sky: 'bg-sky-300' }
const KIND_LABEL: Record<AlertKind, string> = {
  guardian: 'Guardian',
  integration: 'Integrations',
  drift: 'Out of band',
  lockup: 'Lockups',
  settings: 'Settings',
}
const KIND_TONE: Record<AlertKind, string> = {
  guardian: 'text-red-400 ring-red-400/30',
  integration: 'text-red-400 ring-red-400/30',
  drift: 'text-amber-300 ring-amber-300/30',
  lockup: 'text-sky-300 ring-sky-300/30',
  settings: 'text-sky-300 ring-sky-300/30',
}
const SHOWN = 8

/**
 * LES ALERTES — d'abord combien, par famille ; puis chacune, la plus grave en
 * tête. Un vault hors bande montre sa jauge : la dérive mesurée contre la
 * bande autorisée (le repère), pour voir qui est loin et qui la frôle.
 */
export function AlertsList({ alerts }: Readonly<{ alerts: readonly Alert[] }>) {
  const [all, setAll] = useState(false)
  const shown = all ? alerts : alerts.slice(0, SHOWN)
  const counts = (Object.keys(KIND_LABEL) as AlertKind[])
    .map((k) => ({ k, n: alerts.filter((a) => a.kind === k).length }))
    .filter((x) => x.n > 0)
  // L'échelle commune des jauges : la plus forte dérive, ou deux fois la bande.
  const scale = Math.max(1, ...alerts.filter((a) => a.drift).map((a) => Math.max(a.drift!.pt, a.drift!.band * 2)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1.5">
        {counts.map(({ k, n }) => (
          <span key={k} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${KIND_TONE[k]}`}>
            {n} · {KIND_LABEL[k]}
          </span>
        ))}
      </div>

      <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
        {shown.map((a, i) => (
          <li key={i}>
            <Link href={a.href} className="group flex items-start gap-3 py-2.5 no-underline">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[a.tone]}`} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm text-fg">{a.title}</span>
                  {a.drift ? (
                    <span className="shrink-0 text-xs tabular-nums text-amber-300">{a.drift.pt.toFixed(1)} pt</span>
                  ) : null}
                </span>
                {a.drift ? (
                  <span className="relative block h-1.5 rounded-full bg-white/[0.06]" title={a.detail}>
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-amber-300/80"
                      style={{ width: `${Math.min(100, (a.drift.pt / scale) * 100)}%` }}
                    />
                    {/* Le repère : la bande que ce vault tolère. */}
                    <span
                      className="absolute -top-0.5 -bottom-0.5 w-px bg-white/70"
                      style={{ left: `${Math.min(100, (a.drift.band / scale) * 100)}%` }}
                      aria-hidden="true"
                    />
                  </span>
                ) : (
                  <span className="truncate text-xs text-fg-tertiary">{a.detail}</span>
                )}
              </span>
              <span className="text-sm text-fg-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-fg">→</span>
            </Link>
          </li>
        ))}
      </ul>

      {alerts.length > SHOWN ? (
        <button
          type="button"
          onClick={() => setAll((x) => !x)}
          className="inline-flex h-8 items-center self-start rounded-full px-3.5 text-xs font-medium text-fg ring-1 ring-[var(--ud-line)] hover:bg-white/5"
        >
          {all ? 'Show less' : `Show all ${alerts.length} alerts`}
        </button>
      ) : null}
      {alerts.some((a) => a.drift) ? (
        <p className="mt-auto flex items-center gap-2 text-[11px] text-fg-tertiary">
          <span className="inline-block h-2.5 w-px bg-white/70" aria-hidden="true" /> the vault’s allowed band
        </p>
      ) : null}
    </div>
  )
}
