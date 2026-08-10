'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Measures the actual width of the chart slot. Otherwise Recharts'
 * `ResponsiveContainer` produces a 0×0 wrapper inside flex layouts
 * (`min-h-0` / columns). We pass explicit px to BarChart / LineChart.
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
