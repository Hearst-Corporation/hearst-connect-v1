'use client'

import { useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

/**
 * Motion-ready gate — the single reduced-motion + hydration contract every
 * animated widget on this page reuses (mirrors compositions/motion.tsx FadeIn).
 *
 * Returns true only after hydration AND when the user has not asked for reduced
 * motion. Before that it is false, so the first client paint matches SSR (a
 * static, transform-free DOM) and no hydration mismatch occurs. When the user
 * prefers reduced motion, it stays false forever — no animation at all.
 */
export function useMotionReady(): boolean {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
    setMounted(true)
  }, [])

  return mounted && !reduced
}
