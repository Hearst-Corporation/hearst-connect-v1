'use client'

import { useEffect, useMemo, useState } from 'react'

const DEFAULT_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▀▄■□▪▫●○◆◇◈◊※†‡'

function scrambleChar(seed: number, chars: string): string {
  return chars[((seed % chars.length) + chars.length) % chars.length] ?? '·'
}

function scrambleFrame(
  target: string,
  frame: number,
  steps: number,
  chars: string,
): string {
  const progress = Math.min(1, frame / steps)
  const revealed = Math.floor(progress * target.length)
  return target
    .split('')
    .map((char, index) => {
      if (char === ' ') return ' '
      if (index < revealed) return char
      return scrambleChar(frame + index * 7, chars)
    })
    .join('')
}

/**
 * Effet scramble — monté uniquement au survol (AnimatePresence). Sans `Math.random`.
 */
export function ScrambleText({
  children,
  duration = 0.45,
  chars = DEFAULT_CHARS,
  charDelay = 0.05,
}: Readonly<{
  children: string
  duration?: number
  chars?: string
  charDelay?: number
}>) {
  const steps = Math.max(8, Math.ceil(duration / 0.04))
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    let tick = 0
    const id = window.setInterval(() => {
      tick += 1
      setFrame(tick)
      if (tick >= steps) window.clearInterval(id)
    }, Math.max(16, charDelay * 1000))

    return () => window.clearInterval(id)
  }, [charDelay, children, steps])

  const display = useMemo(() => scrambleFrame(children, frame, steps, chars), [chars, children, frame, steps])

  return <span>{display}</span>
}
