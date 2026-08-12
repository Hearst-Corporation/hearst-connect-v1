import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ComponentType, SVGProps } from 'react'
import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { HearstBreakdownDonut, HearstExposureRadial } from '@/components/charts'
import { BreakdownFlank } from '@/features/user-dashboard/breakdown-flank'
import { available, unavailable } from '@/lib/vaults/model'

const StubIcon: ComponentType<SVGProps<SVGSVGElement>> = () => null

/**
 * Account dataviz contract — the guarantees the "premium charts" pass must keep.
 *
 * The point is not that a donut exists; it is that the honest properties survive:
 * no duplicated percentage, a REAL total (never a fabricated 100 %), a named
 * absence instead of a zero, and — for exposure — an ABSOLUTE scale that never
 * normalizes incomplete actuals into a fake full circle.
 */

const REPO = resolve(import.meta.dirname, '..')

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
})

const legendRows = (container: HTMLElement) => [...container.querySelectorAll('ul li')]
const rowFor = (container: HTMLElement, label: string) =>
  legendRows(container).find((li) => li.textContent?.includes(label))

/** Actual arcs are the SVG circles carrying a dash (the track circle has none). */
const actualArcs = (container: HTMLElement) => [
  ...container.querySelectorAll('circle[stroke-dasharray]'),
]
const arcForLabel = (container: HTMLElement, label: string) =>
  actualArcs(container).find((c) => c.querySelector('title')?.textContent?.includes(label))

describe('breakdown donut — percent kind', () => {
  const slices = [
    { label: 'usdc aave', value: 37.6 },
    { label: 'cbbtc aave', value: 33.6 },
    { label: 'rwa mining', value: 28.8 },
  ]

  it('shows each percentage ONCE per legend row — never value + share duplicated', () => {
    const { container } = render(<HearstBreakdownDonut kind="percent" unit="%" slices={slices} />)
    const row = rowFor(container, 'usdc aave')
    expect(row).toBeTruthy()
    const percents = row!.textContent!.match(/37\.6\s*%/g) ?? []
    expect(percents.length).toBe(1)
  })

  it('center reads the REAL measured total, not a fabricated 100 %', () => {
    const { getAllByText } = render(
      <HearstBreakdownDonut
        kind="percent"
        unit="%"
        centerCaption="allocated"
        slices={[
          { label: 'a', value: 50 },
          { label: 'b', value: 42 },
        ]}
      />,
    )
    // 92, not 100 — the buckets do not sum to a full split and the chart says so.
    // Present in BOTH the visible center and the sr-only total (a11y), never 100.
    expect(getAllByText('92%').length).toBeGreaterThanOrEqual(1)
  })

  it('center never rounds a near-100 total up to a fabricated 100 %', () => {
    const { getAllByText, queryByText } = render(
      <HearstBreakdownDonut kind="percent" unit="%" slices={[{ label: 'a', value: 99.7 }]} />,
    )
    expect(getAllByText('99.7%').length).toBeGreaterThanOrEqual(1)
    expect(queryByText('100%')).toBeNull()
  })
})

describe('breakdown donut — count kind', () => {
  const slices = [
    { label: 'user', value: 9 },
    { label: 'strategy', value: 5 },
    { label: 'mining', value: 4 },
    { label: 'electricity', value: 2 },
  ]

  it('shows count AND share — two different, both-meaningful facts', () => {
    const { container, getAllByText } = render(
      <HearstBreakdownDonut kind="count" unit="events" slices={slices} />,
    )
    const row = rowFor(container, 'user')
    expect(row!.textContent).toContain('9')
    expect(row!.textContent).toContain('45%')
    expect(getAllByText('20').length).toBeGreaterThanOrEqual(1) // center + sr-only total
  })
})

describe('breakdown donut — data ranges', () => {
  it('renders 1, 3 and 5+ categories with an intrinsic per-row legend', () => {
    const one = render(<HearstBreakdownDonut kind="percent" unit="%" slices={[{ label: 'solo', value: 100 }]} />)
    expect(legendRows(one.container).length).toBe(1)

    const many = render(
      <HearstBreakdownDonut
        kind="count"
        unit="x"
        slices={[1, 2, 3, 4, 5, 6].map((n) => ({ label: `c${n}`, value: n }))}
      />,
    )
    expect(legendRows(many.container).length).toBe(6)
  })

  it('an all-zero breakdown is a named absence, never a 0-ring', () => {
    const { getByText, container } = render(
      <HearstBreakdownDonut kind="count" unit="events" slices={[{ label: 'a', value: 0 }]} />,
    )
    expect(getByText(/nothing to break down/i)).toBeTruthy()
    expect(container.querySelector('ul')).toBeNull()
  })
})

describe('exposure radial — truthful absolute scale', () => {
  it('an actual arc encodes its ABSOLUTE percent — identical across different totals (no normalization)', () => {
    // Same pocket (index 1 of 2, value 30) in two different actual totals. A
    // normalized pie would draw 30/70 vs 30/40; an absolute gauge draws 30/100
    // both times, so the dash is byte-for-byte identical.
    const dash = (items: { label: string; targetPct: number; actualPct: number | null }[]) => {
      const { container } = render(<HearstExposureRadial items={items} />)
      return arcForLabel(container, 'B')!.getAttribute('stroke-dasharray')
    }
    const sum70 = dash([
      { label: 'A', targetPct: 40, actualPct: 40 },
      { label: 'B', targetPct: 30, actualPct: 30 },
    ])
    const sum40 = dash([
      { label: 'A', targetPct: 10, actualPct: 10 },
      { label: 'B', targetPct: 30, actualPct: 30 },
    ])
    expect(sum70).toBe(sum40)
  })

  it('an actual above 100 % clamps the ring to one full turn but keeps the exact number', () => {
    const { container } = render(
      <HearstExposureRadial items={[{ label: 'S0', targetPct: 90, actualPct: 112 }]} />,
    )
    const [filled, gap] = arcForLabel(container, 'S0')!
      .getAttribute('stroke-dasharray')!
      .split(' ')
      .map(Number)
    // Clamped to a full turn: the filled length equals the circumference (== gap length).
    expect(Math.abs(filled - gap)).toBeLessThan(0.001)
    expect(container.textContent).toContain('112') // exact value survives in legend + sr-only
  })

  it('a null actual invents nothing — no arc, and "—" / "not read" in legend + table', () => {
    const { container } = render(
      <HearstExposureRadial
        items={[
          { label: 'S0', targetPct: 40, actualPct: null },
          { label: 'S1', targetPct: 30, actualPct: 20 },
        ]}
      />,
    )
    // No actual arc is drawn for the unread pocket.
    expect(arcForLabel(container, 'S0')).toBeUndefined()
    // A real reading still draws its arc.
    expect(arcForLabel(container, 'S1')).toBeTruthy()
    // Absence is named, never zeroed.
    expect(container.textContent).toContain('not read')
    const row = rowFor(container, 'S0')
    expect(row!.textContent).toContain('—')
    expect(row!.textContent).not.toMatch(/\b0(\.0)?\s*pt/) // no fabricated 0 drift
  })

  it('with no actual reading at all, the center names the absence (never a 0 drift)', () => {
    const { getByText } = render(
      <HearstExposureRadial items={[{ label: 'S0', targetPct: 40, actualPct: null }]} />,
    )
    expect(getByText(/actual unread/i)).toBeTruthy()
  })

  it('renders totals of 100, below 100 and above 100 without throwing', () => {
    const cases = [
      [
        { label: 'A', targetPct: 50, actualPct: 50 },
        { label: 'B', targetPct: 50, actualPct: 50 },
      ],
      [
        { label: 'A', targetPct: 40, actualPct: 40 },
        { label: 'B', targetPct: 30, actualPct: 17.6 },
        { label: 'C', targetPct: 30, actualPct: 30 },
      ],
      [
        { label: 'A', targetPct: 60, actualPct: 70 },
        { label: 'B', targetPct: 60, actualPct: 55 },
      ],
    ]
    for (const items of cases) {
      const { container } = render(<HearstExposureRadial items={items} />)
      expect(container.querySelector('svg')).toBeTruthy()
    }
  })
})

describe('legacy composition rail is gone', () => {
  it('composition-rail.tsx no longer exists', () => {
    expect(existsSync(resolve(REPO, 'src/features/user-dashboard/composition-rail.tsx'))).toBe(false)
  })

  it('user-dashboard uses the boundary primitives and never imports recharts', () => {
    const src = readFileSync(resolve(REPO, 'src/features/user-dashboard/user-dashboard.tsx'), 'utf8')
    expect(src).not.toMatch(/from ['"]recharts/)
    expect(src).toMatch(/HearstExposureRadial/)
    expect(src).not.toMatch(/CompositionRail|DriftLedger|HearstAllocationChart/)
  })

  it('the stretched rail / ledger / drift CSS rules are removed', () => {
    const css = readFileSync(resolve(REPO, 'src/features/user-dashboard/user-dashboard.css'), 'utf8')
    for (const selector of ['.rail-body', '.ledger-row', '.ledger-share', '.drift-ledger', '.drift-row']) {
      expect(css).not.toMatch(new RegExp(`\\.ud-root\\s+\\${selector}\\s*\\{`))
    }
  })
})

describe('exposure radial — signed drift & worst-drift selection', () => {
  it('the legend prints the correctly-SIGNED drift for over- and under-allocation', () => {
    const { container } = render(
      <HearstExposureRadial
        items={[
          { label: 'A', targetPct: 60, actualPct: 70 }, // +10
          { label: 'B', targetPct: 60, actualPct: 55 }, // -5
        ]}
      />,
    )
    expect(rowFor(container, 'A')!.textContent).toContain('+10')
    expect(rowFor(container, 'B')!.textContent).toContain('-5')
  })

  it('the center shows the WORST (max-abs) drift, not simply the first pocket', () => {
    const { getByText } = render(
      <HearstExposureRadial
        items={[
          { label: 'A', targetPct: 50, actualPct: 55 }, // +5 (first)
          { label: 'B', targetPct: 50, actualPct: 70 }, // +20 (worst)
        ]}
      />,
    )
    // The center metric renders "+20"; the legend cell for B renders "+20 pt" (a
    // different element), so the bare "+20" uniquely identifies the center.
    expect(getByText('+20')).toBeTruthy()
  })

  it('an on-target pocket reads +0 drift — a measured zero, never a named absence', () => {
    const { container } = render(
      <HearstExposureRadial items={[{ label: 'S0', targetPct: 50, actualPct: 50 }]} />,
    )
    const row = rowFor(container, 'S0')!
    expect(row.textContent).toMatch(/\+0(\.0)?\s*pt/)
    expect(row.textContent).not.toContain('—')
    // actual 50 % > 0 → a real arc is drawn (not treated as absence).
    expect(arcForLabel(container, 'S0')).toBeTruthy()
  })

  it('a genuine 0 % actual draws no arc but is NOT a named absence (legend shows 0)', () => {
    const { container } = render(
      <HearstExposureRadial items={[{ label: 'S0', targetPct: 30, actualPct: 0 }]} />,
    )
    // Zero exposure paints nothing (butt cap, gated on > 0) — never a fabricated dot.
    expect(arcForLabel(container, 'S0')).toBeUndefined()
    // But it is a measured 0, distinct from null: the row carries "0", not only "—".
    const row = rowFor(container, 'S0')!
    expect(row.textContent).toMatch(/A\s*0\b/)
  })
})

describe('breakdown flank — the two named absences are preserved', () => {
  it('an unreadable source shows the awaiting-source state', () => {
    const { getByText } = render(
      <BreakdownFlank
        title="Allocation"
        hint="Capital by bucket"
        icon={StubIcon}
        kind="percent"
        unit="%"
        availability={unavailable({ reason: 'source_down' })}
      />,
    )
    expect(getByText(/awaiting a verified source/i)).toBeTruthy()
  })

  it('an available-but-empty source shows the nothing-to-break-down state', () => {
    const { getByText } = render(
      <BreakdownFlank
        title="Activity mix"
        hint="Events by type"
        icon={StubIcon}
        kind="count"
        unit="events"
        availability={available([])}
      />,
    )
    expect(getByText(/nothing to break down yet/i)).toBeTruthy()
  })
})
