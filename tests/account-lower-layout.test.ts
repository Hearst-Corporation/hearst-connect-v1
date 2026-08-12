import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8')

/**
 * Account lower layout — the movements journal owns a full-width region and no
 * longer shares a grid row with a short, mostly-redundant Subscription rail
 * (which forced a tall empty column beside the timeline). Business semantics own
 * the DOM: a journal is standalone; the one genuine contract term (minimum
 * deposit) lives with fund capacity.
 */
describe('account lower layout — no sibling-forced hole', () => {
  const tsx = read('src/features/user-dashboard/user-dashboard.tsx')
  const css = read('src/features/user-dashboard/user-dashboard.css')

  it('the redundant Subscription rail is gone (aside + its 4 duplicate rows)', () => {
    expect(tsx).not.toContain('terms-rail')
    expect(tsx).not.toContain('aria-label="Subscription terms"')
    expect(tsx).not.toContain('movements-main')
    // The rows unique to the rail (duplicating exposure / capacity data) are
    // removed. NAV/share and Utilization stay as KPI tiles — those live in the
    // KPI band, not the rail — so we assert on the rail-only labels.
    expect(tsx).not.toContain('label="Worst drift"')
    expect(tsx).not.toContain('label="Room to cap"')
    // The dead worstDrift computation is gone with them.
    expect(tsx).not.toContain('worstDrift')
  })

  it('the one genuine contract term (minimum deposit) is kept, with fund capacity', () => {
    expect(tsx).toContain('label="Minimum deposit"')
    expect(tsx).toContain('ec-terms')
  })

  it('movements is a full-width region, not a 2-column grid', () => {
    // The grid-template that paired timeline (2fr) with the rail (1fr) is gone.
    expect(css).not.toMatch(/\.ud-root \.movements \{[^}]*grid-template-columns/)
    expect(css).not.toContain('.movements-main')
    // The journal is bounded to a legible measure, left-aligned (a feed, not a
    // full-bleed stretch), so no title-far-from-time trailing.
    expect(css).toMatch(/\.ud-root \.timeline \{[^}]*max-width/)
  })

  it('the timeline still grows the DOCUMENT (its own flow), owning no sibling geometry', () => {
    // MovementTimeline maps all rows (a full verified journal), unchanged.
    const timeline = read('src/features/user-dashboard/movement-timeline.tsx')
    expect(timeline).toContain('rows.map')
    // No sibling in the movements section to force empty geometry.
    expect(tsx).toMatch(/<section className="movements"[\s\S]*?<MovementTimeline[\s\S]*?<\/section>/)
  })
})
