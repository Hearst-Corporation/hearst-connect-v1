import { surfaceBox, surfaceInset, surfaceNav, surfaceRaised, surfaceSelect } from '@/components/admin/surface'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('design system surfaces — canon dashboard', () => {
  it('expose les 4 matières tokenisées', () => {
    expect(surfaceBox).toContain('bg-console-card')
    expect(surfaceBox).toContain('backdrop-blur')
    expect(surfaceBox).toContain('ring-console-line')
    expect(surfaceNav).toContain('bg-console-glass')
    expect(surfaceNav).toContain('backdrop-blur')
    expect(surfaceInset).toContain('bg-console-inset')
    expect(surfaceSelect).toContain('data-selected:bg-accent-soft')
    expect(surfaceRaised).toBe(surfaceBox)
    expect(surfaceNav).not.toBe(surfaceBox)
  })

  it('boxes = verre translucide (pas noir opaque)', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--color-console-card:\s*rgba\(/)
    expect(css).not.toMatch(/--color-console-card:\s*#000000/)
    const panel = readFileSync(join(process.cwd(), 'src/components/layout/console.module.css'), 'utf8')
    expect(panel).toContain('backdrop-filter')
  })

  it('KPI / DashCard / AdminMetric — boxes DashCard ; KPI = bandeau header', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/shell.tsx'), 'utf8')
    const surfaces = readFileSync(join(process.cwd(), 'src/components/admin/surfaces.tsx'), 'utf8')
    const header = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/header.tsx'), 'utf8')
    expect(shell).toContain('surfaceBox')
    expect(surfaces).toContain('surfaceBox')
    expect(header).toContain('DashboardKpiMetrics')
    expect(header).toContain('data-dashboard-kpi-bandeau')
    expect(header).not.toContain('LogoMark')
  })

  it('parcours : sélection via surfaceSelect', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/admin/dashboard/subscription-journey.tsx'),
      'utf8',
    )
    expect(src).toContain('surfaceSelect')
    expect(src).not.toContain('data-selected:bg-zinc-800')
  })

  it('menu : effet verre via surfaceNav', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'),
      'utf8',
    )
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(layout).toContain('surfaceNav')
    expect(css).toMatch(/--color-console-glass:\s*rgba\(0,\s*0,\s*0,\s*0\.4\)/)
  })

  it('service pages : pre / wells passent par surfaceInset', () => {
    const runtime = readFileSync(join(process.cwd(), 'src/app/admin/runtime/page.tsx'), 'utf8')
    const explorer = readFileSync(join(process.cwd(), 'src/app/admin/api-explorer/page.tsx'), 'utf8')
    expect(runtime).toContain('surfaceInset')
    expect(explorer).toContain('surfaceInset')
  })

  it('chart tooltips : surfaceBox (vaults / produit / series)', () => {
    const btc = readFileSync(
      join(process.cwd(), 'src/components/charts/cartesian/btc-production-chart.tsx'),
      'utf8',
    )
    const product = readFileSync(
      join(process.cwd(), 'src/components/charts/cartesian/product-charts.tsx'),
      'utf8',
    )
    const rich = readFileSync(join(process.cwd(), 'src/components/charts/richart/tooltip.tsx'), 'utf8')
    const frame = readFileSync(join(process.cwd(), 'src/components/charts/core/chart-frame.tsx'), 'utf8')
    for (const src of [btc, product, rich]) {
      expect(src).toContain('surfaceBox')
      expect(src).not.toMatch(/bg-white|dark:bg-zinc-800/)
    }
    expect(frame).toContain('surfaceInset')
  })

  it('fond lumineux branché derrière le shell admin', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'),
      'utf8',
    )
    const brand = readFileSync(join(process.cwd(), 'src/lib/brand.ts'), 'utf8')
    expect(brand).toContain('/brand/console-glow.png')
    expect(layout).toContain('CONSOLE_GLOW_SRC')
    expect(existsSync(join(process.cwd(), 'public/brand/console-glow.png'))).toBe(true)
  })
})
