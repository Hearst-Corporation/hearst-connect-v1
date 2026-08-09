import { surfaceBox, surfaceInset, surfaceNav, surfaceSelect } from '@/components/admin/surface'
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
    expect(surfaceNav).not.toBe(surfaceBox)
  })

  it('boxes = verre translucide (pas noir opaque)', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--color-console-card:\s*rgba\(/)
    expect(css).not.toMatch(/--color-console-card:\s*#000000/)
    const panel = readFileSync(join(process.cwd(), 'src/components/layout/console.module.css'), 'utf8')
    expect(panel).toContain('backdrop-filter')
  })

  it('DashCard = surfaceBox ; KPI header = LogoMark + texte bandeau', () => {
    const shell = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/shell.tsx'), 'utf8')
    const surfaces = readFileSync(join(process.cwd(), 'src/components/admin/surfaces.tsx'), 'utf8')
    const header = readFileSync(join(process.cwd(), 'src/components/admin/dashboard/header.tsx'), 'utf8')
    const pageHeader = readFileSync(join(process.cwd(), 'src/components/admin/page-header.tsx'), 'utf8')
    expect(shell).toContain('surfaceBox')
    expect(shell).toContain('data-surface="box"')
    expect(shell).toContain('flex min-h-0 flex-col p-5')
    expect(shell).not.toContain('flex h-full flex-col')
    expect(surfaces).toContain('surfaceBox')
    expect(header).toContain('AdminPageHeader')
    expect(pageHeader).toContain('data-dashboard-kpi-bandeau')
    expect(pageHeader).toContain('LogoMark')
    expect(pageHeader).toContain('AdminHeroKpiMetrics')
  })

  it('Panel compose surfaceBox — plus de csl.panel comme matière', () => {
    const panel = readFileSync(join(process.cwd(), 'src/components/compositions/panel.tsx'), 'utf8')
    expect(panel).toContain("from '@/components/admin/surface'")
    expect(panel).toContain('surfaceBox')
    expect(panel).toContain('data-surface="box"')
    expect(panel).toContain('TONE_GEOMETRY')
    // Runtime : matière = surfaceBox ; pas `clsx(csl.panel, …)`.
    expect(panel).toMatch(/clsx\(surfaceBox,\s*TONE_GEOMETRY/)
    expect(panel).not.toMatch(/clsx\(csl\.panel/)
  })

  it('sidebar admin : lockup officiel Illustrator', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/admin/application-layout.tsx'),
      'utf8',
    )
    const logo = readFileSync(join(process.cwd(), 'src/components/logo.tsx'), 'utf8')
    expect(layout).toContain('HearstConnectLockupImage')
    expect(logo).toContain('HEARST_CONNECT_LOCKUP_SRC')
  })

  it('portfolio exposure : sélection via surfaceSelect', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/admin/dashboard/portfolio-exposure.tsx'),
      'utf8',
    )
    expect(src).toContain('surfaceSelect')
    expect(src).not.toContain('data-selected:bg-console-raised')
  })

  it('menu : effet verre via surfaceNav', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'),
      'utf8',
    )
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(layout).toContain('surfaceNav')
    expect(layout).toMatch(/z-30/)
    expect(layout).toMatch(/lg:pl-64/)
    expect(css).toMatch(/--color-console-glass:\s*rgba\(0,\s*0,\s*0,\s*0\.72\)/)
  })

  it('service pages : pre / wells passent par surfaceInset', () => {
    const runtime = readFileSync(join(process.cwd(), 'src/app/admin/runtime/page.tsx'), 'utf8')
    const explorer = readFileSync(join(process.cwd(), 'src/app/admin/api-explorer/page.tsx'), 'utf8')
    expect(runtime).toContain('surfaceInset')
    expect(explorer).toContain('surfaceInset')
  })

  it('chart tooltips : surfaceBox (vaults / produit / series)', () => {
    const product = readFileSync(
      join(process.cwd(), 'src/components/charts/cartesian/product-charts.tsx'),
      'utf8',
    )
    const rich = readFileSync(join(process.cwd(), 'src/components/charts/richart/tooltip.tsx'), 'utf8')
    const frame = readFileSync(join(process.cwd(), 'src/components/charts/core/chart-frame.tsx'), 'utf8')
    for (const src of [product, rich]) {
      expect(src).toContain('surfaceBox')
      expect(src).not.toMatch(/bg-white|dark:bg-console-raised/)
    }
    expect(frame).toContain('surfaceInset')
  })

  it('fond lumineux branché derrière le shell admin', () => {
    const layout = readFileSync(
      join(process.cwd(), 'src/components/catalyst/sidebar-layout.tsx'),
      'utf8',
    )
    const brand = readFileSync(join(process.cwd(), 'src/lib/brand.ts'), 'utf8')
    expect(brand).toContain('HC-ADMIN-FIXED-BACKGROUND-027')
    // Le glow reste fixé au viewport, mais ancré en haut + masqué vers le bas
    // (confinement — plus de `bg-fixed`/`bg-cover` qui tachaient le centre).
    expect(brand).toContain('fixed inset-0')
    expect(brand).toContain('bg-top')
    expect(brand).toContain('mask-image')
    expect(brand).toContain('/brand/console-glow.png')
    expect(brand).toContain('/brand/hearst-h.svg')
    expect(brand).toContain('/brand/hearst-connect.svg')
    expect(layout).toContain('CONSOLE_GLOW_SRC')
    expect(existsSync(join(process.cwd(), 'public/brand/console-glow.png'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'public/brand/hearst-h.svg'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'public/brand/hearst-connect.svg'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'public/brand/hearst-connect-dark.svg'))).toBe(true)
    expect(existsSync(join(process.cwd(), 'public/brand/hearst-connect-official.svg'))).toBe(true)
  })

  it('favicon onglet = monogramme H mint', () => {
    const icon = readFileSync(join(process.cwd(), 'src/app/icon.svg'), 'utf8')
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
    expect(icon).toContain('#a7fb90')
    expect(icon).toContain('601.74 466.87')
    expect(layout).toContain('/icon.svg')
    expect(existsSync(join(process.cwd(), 'src/app/apple-icon.png'))).toBe(true)
  })
})
