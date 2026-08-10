'use client'

import { motion, useReducedMotion } from 'motion/react'
import type React from 'react'
import { useEffect, useState } from 'react'

/**
 * FadeIn — the gentle entrance, and its short-circuit.
 *
 * ── Why this wrapper exists ────────────────────────────────────────────────
 * The composition blocks (`blocks.tsx`) must be importable from a SERVER
 * component: they cannot be `'use client'`, otherwise any page that drops one
 * in becomes a client page. Motion, however, requires `motion/react`, which is
 * client-only. So we isolate the single client fragment here: `SectionCard`
 * composes this `FadeIn` around its panel and itself stays server-rendered.
 *
 * ── Honoring `prefers-reduced-motion` is STRUCTURAL ────────────────────────
 * `useReducedMotion()` short-circuits the animation: when the user has asked
 * for less motion, we render a plain `div`, with no transition and no
 * transform — not a "more subtle" animation, NONE at all. The default
 * animation stays understated: opacity + 8px translation, 240ms, once on
 * entering the viewport (`whileInView`, `once`).
 *
 * First client render matches SSR (static div) to avoid hydration mismatch when
 * `prefers-reduced-motion` differs between server and browser.
 */
export function FadeIn({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Defer motion until after hydration — server and first client paint stay static.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
    setMounted(true)
  }, [])

  if (!mounted || reduced) {
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
