'use client'

import { useEffect, useRef } from 'react'

/**
 * La file complète des décisions, repliée sous le résumé du tableau de bord.
 *
 * Elle s'ouvre seule quand on arrive par un lien qui la vise (`#decisions`, ou
 * le groupe d'un type : `#distribution`, `#withdrawal`…) : « Details » mène
 * alors droit aux boutons, sans page intermédiaire.
 */
export function DecisionsDisclosure({ count, children }: Readonly<{ count: number; children: React.ReactNode }>) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const open = () => {
      const hash = window.location.hash.slice(1)
      if (hash === '' || ref.current === null) return
      if (hash === 'decisions' || ref.current.querySelector(`[id="${CSS.escape(hash)}"]`) !== null) {
        ref.current.open = true
        document.getElementById(hash)?.scrollIntoView({ block: 'start' })
      }
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  if (count === 0) return null
  return (
    <details ref={ref} id="decisions" className="group mt-4 scroll-mt-24 rounded-[var(--ud-radius-sm)] ring-1 ring-[var(--ud-line)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
        <span className="text-[var(--hearst-green)] transition-transform group-open:rotate-90" aria-hidden="true">
          ▸
        </span>
        Review all {count} decision{count === 1 ? '' : 's'}
        <span className="text-xs font-normal text-fg-tertiary">— approve or decline here</span>
      </summary>
      <div className="border-t border-[var(--ud-line)] px-4 py-4">{children}</div>
    </details>
  )
}
