'use client'

import Link from 'next/link'
import { useState } from 'react'

export type Alert = Readonly<{ tone: 'red' | 'amber' | 'sky'; title: string; detail: string; href: string }>

const DOT: Record<Alert['tone'], string> = { red: 'bg-red-400', amber: 'bg-amber-300', sky: 'bg-sky-300' }
const SHOWN = 5

/** Les alertes, les plus graves d'abord : cinq visibles, toutes d'un clic. */
export function AlertsList({ alerts }: Readonly<{ alerts: readonly Alert[] }>) {
  const [all, setAll] = useState(false)
  const shown = all ? alerts : alerts.slice(0, SHOWN)
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
        {shown.map((a, i) => (
          <li key={i}>
            <Link href={a.href} className="group flex items-start gap-3 rounded-lg py-2.5 no-underline">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[a.tone]}`} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-fg">{a.title}</span>
                <span className="truncate text-xs text-fg-tertiary">{a.detail}</span>
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
    </div>
  )
}
