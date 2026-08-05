'use client'

import { motion, useReducedMotion } from 'motion/react'
import type React from 'react'

/**
 * FadeIn — l'apparition douce, et son court-circuit.
 *
 * ── Pourquoi ce wrapper existe ─────────────────────────────────────────────
 * Les blocs de composition (`blocks.tsx`) sont importables depuis un composant
 * SERVEUR : ils n'ont pas le droit d'être `'use client'`, sinon toute page qui
 * en pose un devient cliente. Le mouvement, lui, exige `motion/react`, qui est
 * client. On isole donc l'unique fragment client ici : `SectionCard` compose ce
 * `FadeIn` autour de son panneau, et reste elle-même rendue côté serveur.
 *
 * ── Le respect de `prefers-reduced-motion` est STRUCTUREL ──────────────────
 * `useReducedMotion()` court-circuite l'animation : quand l'utilisateur a
 * demandé moins de mouvement, on rend un simple `div`, sans transition ni
 * transform — pas une animation « plus discrète », AUCUNE. L'animation par
 * défaut reste sobre : opacité + 8px de translation, 240ms, une seule fois à
 * l'entrée dans le viewport (`whileInView`, `once`).
 */
export function FadeIn({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const reduced = useReducedMotion()

  if (reduced) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
