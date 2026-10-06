'use client'

import { useEffect, useState } from 'react'

/**
 * Le sommaire collant de la fiche client — le MÊME sélecteur que le reste de
 * la console (et que les onglets de /account) : la section où l'on se trouve
 * est en blanc. Elle suit le défilement ; un clic y amène.
 */
export type SectionLink = Readonly<{ id: string; label: string; badge: number }>

export function SectionNav({ sections }: Readonly<{ sections: readonly SectionLink[] }>) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const onScroll = () => {
      // La section active : la dernière dont le haut a passé la ligne du sommaire.
      let current = sections[0]?.id ?? ''
      for (const s of sections) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= 120) current = s.id
      }
      // Tout en bas de page : la dernière section, même courte.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1]?.id ?? current
      }
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections])

  return (
    <nav aria-label="Sections" className="sticky top-0 z-20 -my-2 flex overflow-x-auto bg-[var(--ud-page)]/90 py-2 backdrop-blur">
      <div className="ud-seg" role="tablist">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            role="tab"
            aria-selected={active === s.id}
            onClick={() => setActive(s.id)}
            className={`ud-seg-btn whitespace-nowrap no-underline${active === s.id ? ' active' : ''}`}
          >
            {s.label}
            {s.badge > 0 ? (
              <span
                className={`ml-1.5 rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                  active === s.id ? 'bg-black/10 text-black' : 'bg-amber-400/20 text-amber-400'
                }`}
              >
                {s.badge}
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </nav>
  )
}
