'use client'

import { SegSelect } from '@/components/admin/seg-select'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Les anciennes ancres de la fiche (cloche, file des décisions…) → l'onglet qui porte la section. */
const HASH_TO_TAB: Record<string, string> = {
  decisions: 'overview',
  offer: 'offer',
  projection: 'offer',
  rewards: 'rewards',
  allocation: 'allocation',
  compute: 'compute',
  moves: 'payments',
  transactions: 'payments',
  kyc: 'kyc',
}

/**
 * LES ONGLETS DE LA FICHE CLIENT — une vue à la fois.
 *
 * La fiche faisait 6 500 px : parcours, offre, courriels, décisions, rewards,
 * allocation, calcul, mouvements, KYC, tout à la suite, et la même décision
 * affichée à trois endroits. Chaque onglet est maintenant une URL (`?tab=`) :
 * on la partage, on y revient, le navigateur sait reculer.
 */
export type ClientTab = Readonly<{ id: string; label: string; badge: number }>

export function ClientTabs({
  tabs,
  active,
  base,
}: Readonly<{ tabs: readonly ClientTab[]; active: string; base: string }>) {
  const router = useRouter()
  const hrefOf = (id: string) => `${base}${base.includes('?') ? '&' : '?'}tab=${id}`
  // Arrivé par une ancre : on ouvre l'onglet qui la porte.
  useEffect(() => {
    const target = HASH_TO_TAB[window.location.hash.slice(1)]
    if (target && target !== active && tabs.some((t) => t.id === target)) router.replace(hrefOf(target), { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <nav aria-label="Client sections" className="sticky top-0 z-20 -my-2 flex overflow-x-auto bg-[var(--ud-page)]/90 py-2 backdrop-blur">
      <SegSelect
        label="Section"
        value={active}
        options={tabs.map((t) => ({ value: t.id, label: t.badge > 0 ? `${t.label} (${t.badge})` : t.label }))}
        onChange={(id) => router.push(hrefOf(id), { scroll: false })}
      />
      <div className="ud-seg seg-collapsible" role="tablist">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={hrefOf(t.id)}
            scroll={false}
            role="tab"
            aria-selected={active === t.id}
            className={`ud-seg-btn whitespace-nowrap no-underline${active === t.id ? ' active' : ''}`}
          >
            {t.label}
            {t.badge > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-300/20 px-1.5 text-[10px] font-semibold text-amber-300 tabular-nums">
                {t.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  )
}
