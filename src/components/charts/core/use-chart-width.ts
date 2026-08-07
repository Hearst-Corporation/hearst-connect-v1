'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Mesure la largeur réelle du slot chart. Recharts `ResponsiveContainer`
 * produit sinon un wrapper 0×0 dans les flex (`min-h-0` / colonnes).
 * On passe des px explicites à BarChart / LineChart.
 */
export function useChartWidth(): {
  readonly ref: React.RefObject<HTMLDivElement | null>
  readonly width: number
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const next = Math.floor(el.getBoundingClientRect().width)
      if (next > 0) setWidth(next)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, width }
}
