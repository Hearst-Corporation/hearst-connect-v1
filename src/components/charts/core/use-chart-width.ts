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

/**
 * Measures the actual width AND height of the chart slot. Used when a renderer
 * carries chrome (e.g. a legend) inside a fixed role viewport: the plot fills
 * the flex remainder, and recharts needs explicit px for both axes. This reads
 * the slot the LAYOUT gives (a `flex-1` cell inside a fixed-height parent) — it
 * never grows the parent to fit the chart, so the viewport stays role-owned.
 */
export function useChartSize(): {
  readonly ref: React.RefObject<HTMLDivElement | null>
  readonly width: number
  readonly height: number
} {
  const ref = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const measure = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      if (width > 0 && height > 0) {
        setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
      }
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, width: size.width, height: size.height }
}
