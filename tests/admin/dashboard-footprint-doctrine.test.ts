import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = (p: string) => resolve(import.meta.dirname, '../../', p)

const RULE = readFileSync(root('.cursor/rules/60-design-system.mdc'), 'utf8')
const TOKENS = readFileSync(root('src/styles/tailwind.css'), 'utf8')

describe('dashboard bounded-content doctrine', () => {
  it('states that dataset size must not control layout geometry', () => {
    expect(RULE).toContain('DATASET SIZE MUST NOT CONTROL LAYOUT GEOMETRY.')
    expect(RULE).toContain('Responsive = **container-driven**.')
    expect(RULE).toContain('`CARD SHELL` → intrinsèque par défaut')
    expect(RULE).toContain('`CONTENT SLOT` → stable si le contenu varie quantitativement')
    expect(RULE).toContain('`CHART VIEWPORT` → stable')
    expect(RULE).toContain('`PLACEHOLDER` → remplit exactement le content slot correspondant')
  })

  it('forbids the old fixed-card doctrine', () => {
    expect(RULE).not.toContain('Dashboard height = **semantic footprint**.')
    expect(RULE).not.toContain('same global card height')
  })

  it('defines only internal slot tokens, not global card-height tokens', () => {
    expect(TOKENS).not.toContain('--dashboard-footprint-compact')
    expect(TOKENS).not.toContain('--dashboard-footprint-standard')
    expect(TOKENS).not.toContain('--dashboard-footprint-data')
    expect(TOKENS).not.toContain('--dashboard-footprint-chart')
    for (const token of [
      '--dashboard-chart-slot-block-size',
      '--dashboard-list-slot-block-size',
      '--dashboard-summary-slot-block-size',
    ]) {
      expect(TOKENS).toContain(token)
    }
  })
})
