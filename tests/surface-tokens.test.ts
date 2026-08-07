import { surfaceBox, surfaceNav, surfaceRaised } from '@/components/admin/surface'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('surfaces tokenisées — boxes noires + voile sélection', () => {
  it('surfaceBox / surfaceRaised passent par console-card', () => {
    expect(surfaceBox).toContain('bg-console-card')
    expect(surfaceBox).toContain('ring-console-line')
    expect(surfaceRaised).toBe(surfaceBox)
  })

  it('KPI et DashCard consomment surfaceBox', () => {
    const kpi = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/kpi-grid.tsx'), 'utf8')
    const shell = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/shell.tsx'), 'utf8')
    expect(kpi).toContain('surfaceBox')
    expect(shell).toContain('surfaceBox')
    expect(kpi).not.toMatch(/dark:bg-zinc-900/)
  })

  it('parcours : sélection = accent-soft, pas un fond zinc', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/admin/dashboard/subscription-journey.tsx'),
      'utf8',
    )
    expect(src).toContain('data-selected:bg-accent-soft')
    expect(src).not.toContain('data-selected:bg-zinc-800')
    expect(src).not.toContain('data-selected:bg-zinc-50')
  })

  it('menu sidebar : noir deep (console-card), comme les boxes', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'),
      'utf8',
    )
    expect(layout).toContain('bg-console-card')
    expect(surfaceNav).toBe('bg-console-card')
  })
})
