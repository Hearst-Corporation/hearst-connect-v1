import { HearstDonutChart } from '@/components/charts/richart/donut-chart'
import { HearstExposureDonut } from '@/components/charts/richart/exposure-donut'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

describe('account dataviz — real Recharts, behind the boundary', () => {
  it('the account view imports NO recharts directly (charts boundary holds)', () => {
    const dash = read('src/features/user-dashboard/user-dashboard.tsx')
    const flank = read('src/features/user-dashboard/breakdown-flank.tsx')
    expect(dash).not.toMatch(/from ['"]recharts['"]/)
    expect(flank).not.toMatch(/from ['"]recharts['"]/)
    // Breakdowns + exposure travel through the shared boundary.
    expect(flank).toContain("from '@/components/charts'")
    expect(dash).toContain('HearstExposureDonut')
    expect(dash).toContain('BreakdownFlank')
  })

  it('the fake CompositionRail (stretched HTML + duplicate %) is gone', () => {
    expect(() => read('src/features/user-dashboard/composition-rail.tsx')).toThrow()
    const dash = read('src/features/user-dashboard/user-dashboard.tsx')
    expect(dash).not.toContain('CompositionRail')
    // The flex:1 fill-height ledger classes are gone from the stylesheet.
    const css = read('src/features/user-dashboard/user-dashboard.css')
    expect(css).not.toContain('.ledger-row')
    expect(css).not.toContain('.rail-seg')
  })

  it('a percent breakdown prints ONE value column — never the 37.6/37.6 duplicate', () => {
    const { container } = render(
      <HearstDonutChart
        slices={[
          { label: 'usdc aave', value: 37.6 },
          { label: 'cbbtc aave', value: 33.6 },
        ]}
        unit="%"
        format="percent"
      />,
    )
    // Legend rows show the value once; there is no separate share cell.
    const rows = [...container.querySelectorAll('ul li')]
    expect(rows.length).toBe(2)
    const first = rows[0].textContent ?? ''
    expect((first.match(/37\.6%/g) ?? []).length).toBe(1)
    // sr-only table has no Share column in percent mode.
    expect(container.querySelector('table')?.textContent).not.toContain('Share')
  })

  it('a count breakdown adds a DISTINCT share column (count + share, both meaningful)', () => {
    const { container } = render(
      <HearstDonutChart
        slices={[
          { label: 'user', value: 9 },
          { label: 'strategy', value: 5 },
        ]}
        unit="events"
        format="count"
        showShare
      />,
    )
    const first = container.querySelector('ul li')?.textContent ?? ''
    expect(first).toContain('9') // raw count
    expect(first).toContain('64%') // share 9/14 — different number, not a duplicate
  })
})

describe('exposure donut — truthful target vs actual, no fake 100%', () => {
  const pockets = [
    { label: 'Strategy 0', targetPct: 40, actualPct: 40 },
    { label: 'Strategy 1', targetPct: 30, actualPct: 17.6 },
    { label: 'Strategy 2', targetPct: 30, actualPct: 30 },
  ]

  it('center shows the REAL deployed share (≈88%), never a normalized 100%', () => {
    const { container } = render(<HearstExposureDonut items={pockets} />)
    const text = container.textContent ?? ''
    expect(text).toContain('88%')
    expect(text).toContain('deployed')
    // No fabricated full-circle claim and no invented remainder category.
    expect(text).not.toContain('100%')
    expect(text.toLowerCase()).not.toContain('unallocated')
    expect(text.toLowerCase()).not.toContain('idle')
  })

  it('a null actual is shown as "—", never coerced to 0, and blocks the deployed total', () => {
    const withNull = [
      { label: 'Strategy 0', targetPct: 40, actualPct: 40 },
      { label: 'Strategy 1', targetPct: 30, actualPct: null },
      { label: 'Strategy 2', targetPct: 30, actualPct: 30 },
    ]
    const { container } = render(<HearstExposureDonut items={withNull} />)
    const text = container.textContent ?? ''
    // Legend/table carries an em dash for the unread pocket.
    expect(text).toContain('—')
    // With an unread pocket the center refuses a summed-with-holes deployed number.
    expect(text).not.toContain('deployed')
    expect(text.toLowerCase()).not.toContain('idle')
    // Drift for the null pocket is '—', not a fabricated value.
    expect(text).toContain('strategies')
  })

  it('the source never coerces an absent actual to zero (no ?? 0 / || 0)', () => {
    const src = read('src/components/charts/richart/exposure-donut.tsx')
    expect(src).not.toMatch(/\?\?\s*0\b/)
    expect(src).not.toMatch(/\|\|\s*0\b/)
  })
})
