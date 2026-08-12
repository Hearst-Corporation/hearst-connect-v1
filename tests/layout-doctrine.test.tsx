import { BentoCard, BentoGrid } from '@/components/admin/grid'
import {
  ADMIN_NAV,
  ADMIN_SECONDARY,
  ADMIN_SECONDARY_FLAT,
  ADMIN_SECTION_HUBS,
  activeSecondaryGroup,
  activeHref,
  activeBodyHref,
  bodySubmenus,
} from '@/lib/admin-nav'
import {
  CHART_VIEWPORT_PX,
  chartHeight,
  chartViewport,
  plottableAsChart,
} from '@/components/charts/core/chart-theme'
import { render } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The layout rules a visual reviewer rejected the previous build over.
 *
 * A rule that lives only in a comment gets undone by the next person in a
 * hurry. These are the ones a machine can hold: the size of the primary
 * navigation, the readable measure, the balance of a metric grid, and the
 * refusal to plot a trend from a single observation.
 */

describe('primary navigation', () => {
  it('offers exactly five primary destinations', () => {
    expect(ADMIN_NAV).toHaveLength(5)
    expect(ADMIN_NAV.map((e) => e.label)).toEqual([
      'Dashboard',
      'Vaults',
      'Clients',
      'Compliance',
      'Operations',
    ])
  })

  it('keeps consolidated and service destinations reachable via nav or redirects', () => {
    const reachable = new Set([
      ...ADMIN_NAV.map((e) => e.href),
      ...ADMIN_SECTION_HUBS.map((h) => h.href),
      ...ADMIN_SECONDARY_FLAT.map((e) => e.href),
      '/admin/product',
    ])
    const demoted = ['/admin/series-1', '/admin/product', '/admin/runtime']
    for (const href of demoted) expect(reachable.has(href)).toBe(true)
    expect(reachable.has('/admin')).toBe(true)
  })

  it('highlights the longest matching body sub-nav entry', () => {
    expect(activeBodyHref('/admin/vaults/abc')).toBeUndefined()
    // Service est multi-entrée (runtime + api-explorer + keeper) : l'entrée active est mise en avant.
    expect(activeBodyHref('/admin/runtime')).toBe('/admin/runtime')
    expect(activeBodyHref('/admin/api-explorer')).toBe('/admin/api-explorer')
    // Portfolio (Série 1) reste mono-entrée : pas de sous-nav.
    expect(activeBodyHref('/admin/series-1')).toBeUndefined()
    expect(activeBodyHref('/admin')).toBeUndefined()
  })

  it('exposes horizontal sub-menus only for multi-entry sections', () => {
    // Service est désormais multi-entrée (runtime + api-explorer + keeper).
    expect(bodySubmenus('/admin/runtime')?.length).toBe(3)
    expect(activeSecondaryGroup('/admin/runtime')?.title).toBe('Service')
    // Production et Portfolio restent mono-entrée : pas de sous-nav horizontale.
    expect(bodySubmenus('/admin/product')).toBeUndefined()
    expect(bodySubmenus('/admin/series-1')).toBeUndefined()
    expect(bodySubmenus('/admin')).toBeUndefined()
    expect(activeSecondaryGroup('/admin/product')?.title).toBe('Production')
    expect(activeSecondaryGroup('/admin/series-1')?.title).toBe('Portfolio')
  })

  it('does not force a primary highlight on secondary screens', () => {
    for (const entry of ADMIN_SECONDARY_FLAT) {
      expect(activeHref(entry.href)).toBeUndefined()
    }
    expect(activeHref('/admin')).toBe('/admin')
    expect(activeHref('/admin/clients')).toBe('/admin/clients')
    expect(activeHref('/admin/operations')).toBe('/admin/operations')
  })

  it('never lists the same destination twice', () => {
    const hrefs = [...ADMIN_NAV.map((e) => e.href), ...ADMIN_SECONDARY_FLAT.map((e) => e.href)]
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(ADMIN_SECONDARY.every((g) => g.entries.length > 0)).toBe(true)
  })
})

describe('masonry Bento grid', () => {
  it('reflows on the container, not the viewport', () => {
    const { container } = render(
      <BentoGrid>
        <BentoCard>main</BentoCard>
        <BentoCard>aside</BentoCard>
      </BentoGrid>,
    )
    /*
     * Deux nœuds : l'enveloppe DÉCLARE le conteneur (`@container`), la grille
     * l'INTERROGE (`@[Nrem]:`). Les réunir était le défaut historique — un
     * élément en `container-type: inline-size` ne s'interroge pas lui-même :
     * `@[60rem]:` remonterait au conteneur au-dessus (`.workspace`, 1200 px) et
     * une grille de 360 px ouvrirait toutes ses colonnes.
     */
    const enveloppe = container.firstElementChild
    const grid = enveloppe?.firstElementChild
    expect(enveloppe?.className).toContain('@container')
    expect(grid?.className).not.toContain('@container')

    /*
     * Masonry natif via CSS multi-column, piloté par le CONTENEUR : 1 colonne →
     * 2 en `@[60rem]:`. Aucun palier `sm:`/`md:`/`lg:` de fenêtre — la grille
     * vit dans une colonne dont la largeur dépend du rail et de l'aside, que la
     * taille de la fenêtre ne décrit pas. Pas de `grid-cols`/`col-span` : un
     * masonry ne dimensionne pas ses cartes, elles coulent.
     */
    expect(grid?.className).toContain('columns-1')
    expect(grid?.className).toMatch(/@\[[\d.]+rem\]:columns-2/)
    expect(grid?.className).not.toMatch(/\b(sm|md|lg|xl):columns-/)
    expect(grid?.className).not.toMatch(/grid-cols-/)
  })

  it('lets cards flow instead of declaring a span, and never splits one', () => {
    const { container } = render(
      <BentoGrid>
        <BentoCard>a</BentoCard>
        <BentoCard>b</BentoCard>
      </BentoGrid>,
    )
    const grid = container.firstElementChild?.firstElementChild
    for (const card of Array.from(grid?.children ?? [])) {
      /*
       * Une carte ne déclare PAS un nombre de colonnes (`span={7}`) — c'est ce
       * hardcode qui figeait et écrasait l'ancienne grille sous le rail. Dans un
       * masonry, la carte tombe dans la colonne la plus courte ; elle doit juste
       * ne jamais être coupée par un saut de colonne.
       */
      expect(card.className).toContain('break-inside-avoid')
      expect(card.className).not.toMatch(/col-span-/)
    }
  })
})

describe('one brand palette', () => {
  /** Every runtime source file of the admin console. */
  function adminSources(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'catalyst') continue // vendored kit, not ours to police
        adminSources(full, acc)
      } else if (/\.tsx?$/.test(entry.name)) {
        acc.push(full)
      }
    }
    return acc
  }

  it('spends no fourth hue on the console', () => {
    // The approved system is neutral graphite + the Hearst mint + three
    // semantic tones. `info` blue was a fourth hue used for alerts that need
    // no decision — it competed with the tones that do mean something, and
    // the approved direction is explicit: no blue.
    const offenders: string[] = []
    for (const file of [
      ...adminSources(join(process.cwd(), 'src/app/admin')),
      ...adminSources(join(process.cwd(), 'src/components/admin')),
    ]) {
      const source = readFileSync(file, 'utf8')
      if (/\b(?:text|bg|ring|border|fill|stroke)-(?:info-\d|hearst-info)/.test(source)) {
        offenders.push(file.replace(process.cwd(), ''))
      }
    }
    expect(offenders, `these files still use a blue hue: ${offenders.join(', ')}`).toEqual([])
  })

  it('declares glass console surfaces on a graphite-olive shell', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    const token = (name: string): string | undefined =>
      new RegExp(`--color-console-${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

    expect(token('app')).toBe('#0b0f10')
    expect(token('shell')).toBe('#060908')
    expect(token('raised')).toBe('#232a26')
    expect(token('card')).toMatch(/^rgba\(0,\s*0,\s*0,\s*0\.28\)$/)
    expect(token('card-top')).toMatch(/^rgba\(10,\s*10,\s*10,\s*0\.38\)$/)
    expect(token('inset')).toMatch(/^rgba\(10,\s*10,\s*10,\s*0\.4\)$/)

    // Near-black graphite/olive — not a bright wash.
    for (const name of ['app', 'shell', 'raised']) {
      const hex = token(name) ?? ''
      const lum = parseInt(hex.slice(1, 3), 16)
      expect(lum, `console-${name} too bright`).toBeLessThan(40)
    }

    // Sidebar (shell) stays darker than the app canvas.
    const channel = (hex: string): number => parseInt(hex.slice(1, 3), 16)
    expect(channel(token('app') ?? '#fff')).toBeGreaterThan(channel(token('shell') ?? '#000'))
  })

  it('expose un voile mint de sélection (accent-soft)', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--color-accent-soft:\s*rgba\(167,\s*251,\s*144,\s*0\.1\)/)
  })

  it('keeps the console accent on the approved brand mint', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    const darkRamp = css.slice(css.indexOf('.dark {'))
    expect(/--color-accent-400:\s*#a7fb90;/.test(darkRamp)).toBe(true)
    expect(css).toMatch(/--color-fg:\s*#f3f5f2;/)
    expect(css).toMatch(/--color-fg-secondary:\s*#a8aea9;/)
  })
})

describe('asymmetric secondary region — no unbounded fr track', () => {
  /*
   * Rule 60 "Panel / grid track contract": in a PRIMARY + SECONDARY or
   * PRIMARY + BOUNDED FLANKS composition, the secondary/flank region must be
   * intrinsic or bounded (a px/rem ceiling), never a proportional `fr` share
   * that keeps growing with the viewport. This does NOT apply to homogeneous
   * collections (KPI grids, masonry) — those keep equal `fr` tracks on
   * purpose; asserted separately below by absence, not by a blanket ban on
   * `fr`.
   */
  const css = readFileSync(join(process.cwd(), 'src/features/user-dashboard/user-dashboard.css'), 'utf8')

  it('.analysis flanks (donut legends) are bounded, not proportional — center absorbs the row', () => {
    const rule = /\.ud-root \.analysis \{[^}]*grid-template-columns:\s*([^;]+);/.exec(css)
    expect(rule, '.ud-root .analysis grid-template-columns not found').toBeTruthy()
    const template = rule![1]
    // Flanks: a bounded track (two length values in minmax, e.g. 220px..320px),
    // never a `fr` unit — a flank must stop growing once it reaches its cap.
    const flankTracks = template.match(/minmax\([^)]*\)/g) ?? []
    expect(flankTracks).toHaveLength(3)
    expect(flankTracks[0]).not.toMatch(/fr/)
    expect(flankTracks[2]).not.toMatch(/fr/)
    // Center: the only track allowed to claim the row's free space.
    expect(flankTracks[1]).toMatch(/minmax\(0,\s*1fr\)/)
  })

  it('.exposure-cap: Fund capacity is bounded, Strategy exposure absorbs the row', () => {
    const rule = /\.ud-root \.exposure-cap \{[^}]*grid-template-columns:\s*([^;]+);/.exec(css)
    expect(rule, '.ud-root .exposure-cap grid-template-columns not found').toBeTruthy()
    const template = rule![1]
    const tracks = template.match(/minmax\([^)]*\)/g) ?? []
    expect(tracks).toHaveLength(2)
    // Primary (Strategy exposure, first column) absorbs free space.
    expect(tracks[0]).toMatch(/minmax\(0,\s*1fr\)/)
    // Secondary (Fund capacity, second column) is bounded — no `fr`, both a
    // floor and a ceiling in px so it stops growing past a comfortable width.
    expect(tracks[1]).not.toMatch(/fr/)
    expect(tracks[1]).toMatch(/^minmax\(\d+px,\s*\d+px\)$/)
  })

  it('/admin/operations keeps its already-correct primary/bounded-secondary split', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/admin/operations/page.tsx'), 'utf8')
    expect(page).toMatch(/lg:grid-cols-\[minmax\(0,1fr\)_minmax\(14rem,20rem\)\]/)
  })

  it('/admin/client-simulator/new form keeps a reading/form measure cap', () => {
    const form = readFileSync(
      join(process.cwd(), 'src/app/admin/client-simulator/new/create-client-form.tsx'),
      'utf8',
    )
    expect(form).toMatch(/<form[^>]*\bmax-w-\w+\b/)
  })

  it('the dead .bottomRow 3-fr split does not reactivate without a bound', () => {
    // console.module.css keeps a currently-unconsumed 3-way `@container` split
    // (wave panel / info grid / vault card) shaped exactly like the audited
    // bug (`1.2fr 1fr 0.85fr`, all zero-floor). It has no `.tsx` consumer
    // today (legacy /espace shell) — this guard fails loudly if it is ever
    // reactivated without first bounding its secondary tracks.
    const shell = readFileSync(join(process.cwd(), 'src/components/layout/console.module.css'), 'utf8')
    function walk(dir: string): string[] {
      return readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) return walk(full)
        if (!/\.tsx?$/.test(entry.name)) return []
        return readFileSync(join(process.cwd(), full), 'utf8').includes('bottomRow') ? [full] : []
      })
    }
    const consumers = walk('src')
    expect(shell).toContain('.bottomRow')
    expect(consumers, `.bottomRow gained a consumer — fix its fr split before wiring it up: ${consumers.join(', ')}`).toEqual([])
  })
})

describe('chart sizing', () => {
  it('always keeps the chart slot open, even for a short or empty series', () => {
    expect(plottableAsChart(0)).toBe(true)
    expect(plottableAsChart(1)).toBe(true)
    expect(plottableAsChart(2)).toBe(true)
  })

  it('owns viewport by role — dataset length does not change height', () => {
    expect(chartHeight('rows', 3)).toBe(chartHeight('rows', 8))
    expect(chartHeight('columns', 2)).toBe(chartHeight('columns', 200))
    expect(chartHeight('line', 2)).toBe(chartHeight('line', 90))
    expect(chartHeight('donut', 4)).toBe(CHART_VIEWPORT_PX.donut)
    expect(chartViewport('hero')).toBe(CHART_VIEWPORT_PX.hero)
    expect(chartViewport('compact')).toBe(CHART_VIEWPORT_PX.compact)
  })
})
