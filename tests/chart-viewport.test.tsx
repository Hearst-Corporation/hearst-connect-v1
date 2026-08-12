import { ChartPlaceholder } from '@/components/admin/dashboard/charts-panel'
import { ChartFrame } from '@/components/charts/core/chart-frame'
import {
  CHART_SPARK_VIEWPORT_PX,
  CHART_VIEWPORT_PX,
  chartHeight,
  chartViewport,
  resolveChartViewport,
} from '@/components/charts/core/chart-theme'
import { HearstLineChart } from '@/components/charts/richart/line-chart'
import { RichSparkline } from '@/components/charts/richart/sparkline'
import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
})

describe('chart viewport contract', () => {
  it('does not derive height from dataset length', () => {
    expect(chartHeight('line', 2)).toBe(chartHeight('line', 200))
    expect(chartHeight('rows', 2)).toBe(chartHeight('rows', 50))
    expect(chartHeight('columns', 3)).toBe(chartHeight('columns', 40))
    expect(resolveChartViewport({ kind: 'line' })).toBe(CHART_VIEWPORT_PX.standard)
  })

  it('exposes role viewports without page-specific names', () => {
    expect(chartViewport('compact')).toBe(176)
    expect(chartViewport('standard')).toBe(240)
    expect(chartViewport('hero')).toBe(340)
    expect(chartViewport('donut')).toBe(220)
    expect(CHART_SPARK_VIEWPORT_PX).toBe(28)
  })

  it('keeps populated and empty line charts on the same viewport role', () => {
    const sparse = Array.from({ length: 2 }, (_, i) => ({
      label: `2026-01-0${i + 1}`,
      value: i + 1,
    }))
    const dense = Array.from({ length: 90 }, (_, i) => ({
      label: `2026-01-${String(i + 1).padStart(2, '0')}`,
      value: i,
    }))

    const { container: cSparse, unmount: u1 } = render(
      <HearstLineChart points={sparse} unit="USDC" viewport="hero" />,
    )
    const sparseVp = cSparse.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport')
    u1()

    const { container: cDense, unmount: u2 } = render(
      <HearstLineChart points={dense} unit="USDC" viewport="hero" />,
    )
    const denseVp = cDense.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport')
    u2()

    const { container: cEmpty } = render(
      <HearstLineChart points={[]} unit="USDC" viewport="hero" />,
    )
    const emptyVp = cEmpty.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport')

    expect(sparseVp).toBe(String(CHART_VIEWPORT_PX.hero))
    expect(denseVp).toBe(String(CHART_VIEWPORT_PX.hero))
    expect(emptyVp).toBe(String(CHART_VIEWPORT_PX.hero))
  })

  it('ChartFrame empty/unavailable use the role viewport (not a legacy 200/140)', () => {
    const { container: empty } = render(
      <ChartFrame
        question="Q"
        unit="u"
        state={{ type: 'empty', explanation: 'none' }}
        viewport="compact"
      />,
    )
    expect(empty.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport')).toBe(
      String(CHART_VIEWPORT_PX.compact),
    )

    const { container: unavailable } = render(
      <ChartFrame
        question="Q"
        unit="u"
        state={{ type: 'unavailable', explanation: 'down' }}
        viewport="standard"
      />,
    )
    expect(
      unavailable.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport'),
    ).toBe(String(CHART_VIEWPORT_PX.standard))
  })

  it('ChartPlaceholder shares the compact viewport with admin charts', () => {
    const { container } = render(<ChartPlaceholder title="Activity" viewport="compact" />)
    expect(container.querySelector('[data-chart-viewport]')?.getAttribute('data-chart-viewport')).toBe(
      String(CHART_VIEWPORT_PX.compact),
    )
    // No independent default 140 when role is set.
    const el = container.querySelector('[data-widget="chart-placeholder"]') as HTMLElement
    expect(el.style.height).toBe(`${CHART_VIEWPORT_PX.compact}px`)
    expect(el.style.minHeight).toBe(`${CHART_VIEWPORT_PX.compact}px`)
  })

  it('sparkline keeps an independent component-level viewport', () => {
    const { container } = render(<RichSparkline data={[1, 2, 3, 4]} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.height).toBe(`${CHART_SPARK_VIEWPORT_PX}px`)
  })
})
