import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('layout fluide — pas de plafond fixe qui écrase les grilles', () => {
  it('SidebarLayout n’impose plus max-w-6xl sur le contenu', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'), 'utf8')
    expect(src).not.toMatch(/max-w-6xl/)
    expect(src).toMatch(/w-full min-w-0/)
  })

  it('AdminPageHeader n’impose plus max-w-4xl', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/admin/page-header.tsx'), 'utf8')
    expect(src).not.toMatch(/max-w-4xl/)
  })

  it('StatGrid utilise des container queries, pas sm/lg viewport', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/compositions/blocks.tsx'), 'utf8')
    const start = src.indexOf('export function StatGrid')
    const end = src.indexOf('export function SectionCard', start)
    const statGrid = src.slice(start, end)
    expect(statGrid).toContain('@container')
    expect(statGrid).toContain('AdminMetricGrid')
    expect(statGrid).not.toContain('lg:grid-cols-4')
    expect(statGrid).not.toContain('sm:grid-cols-2')
  })

  it('metricsRow / bottomRow ne posent plus de pistes px fixes par défaut', () => {
    const css = readFileSync(join(process.cwd(), 'src/components/layout/console.module.css'), 'utf8')
    const metricsStart = css.indexOf('.metricsRow {')
    const metricsBlock = css.slice(metricsStart, css.indexOf('}', metricsStart) + 1)
    const bottomStart = css.indexOf('.bottomRow {')
    const bottomBlock = css.slice(bottomStart, css.indexOf('}', bottomStart) + 1)
    expect(metricsBlock).toContain('auto-fit')
    expect(metricsBlock).not.toMatch(/var\(--csl-aside-w\)/)
    expect(bottomBlock).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/)
  })
})
