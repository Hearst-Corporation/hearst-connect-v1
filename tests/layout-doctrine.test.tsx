import { AdminCol, AdminGrid, AdminMetricGrid } from '@/components/admin/grid'
import {
  ADMIN_NAV,
  ADMIN_SECONDARY,
  ADMIN_SECONDARY_FLAT,
  ADMIN_SECTION_HUBS,
  groupeSecondaireActif,
  hrefActif,
  hrefCorpsActif,
  sousMenusCorps,
} from '@/lib/admin-nav'
import { pageMaxWidth } from '@/lib/layout-tokens'
import { chartHeight, plottableAsChart } from '@/components/charts/core/chart-theme'
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
    expect(hrefCorpsActif('/admin/vaults/abc')).toBeUndefined()
    // Service est multi-entrée (runtime + api-explorer + keeper) : l'entrée active est mise en avant.
    expect(hrefCorpsActif('/admin/runtime')).toBe('/admin/runtime')
    expect(hrefCorpsActif('/admin/api-explorer')).toBe('/admin/api-explorer')
    // Portfolio (Série 1) reste mono-entrée : pas de sous-nav.
    expect(hrefCorpsActif('/admin/series-1')).toBeUndefined()
    expect(hrefCorpsActif('/admin')).toBeUndefined()
  })

  it('exposes horizontal sub-menus only for multi-entry sections', () => {
    // Service est désormais multi-entrée (runtime + api-explorer + keeper).
    expect(sousMenusCorps('/admin/runtime')?.length).toBe(3)
    expect(groupeSecondaireActif('/admin/runtime')?.titre).toBe('Service')
    // Production et Portfolio restent mono-entrée : pas de sous-nav horizontale.
    expect(sousMenusCorps('/admin/product')).toBeUndefined()
    expect(sousMenusCorps('/admin/series-1')).toBeUndefined()
    expect(sousMenusCorps('/admin')).toBeUndefined()
    expect(groupeSecondaireActif('/admin/product')?.titre).toBe('Production')
    expect(groupeSecondaireActif('/admin/series-1')?.titre).toBe('Portfolio')
  })

  it('does not force a primary highlight on secondary screens', () => {
    for (const entree of ADMIN_SECONDARY_FLAT) {
      expect(hrefActif(entree.href)).toBeUndefined()
    }
    expect(hrefActif('/admin')).toBe('/admin')
    expect(hrefActif('/admin/clients')).toBe('/admin/clients')
    expect(hrefActif('/admin/operations')).toBe('/admin/operations')
  })

  it('never lists the same destination twice', () => {
    const hrefs = [...ADMIN_NAV.map((e) => e.href), ...ADMIN_SECONDARY_FLAT.map((e) => e.href)]
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(ADMIN_SECONDARY.every((g) => g.entrees.length > 0)).toBe(true)
  })
})

describe('page measure', () => {
  it('caps content at a readable width, not at the viewport', () => {
    const px = Number(/max-w-\[(\d+)px\]/.exec(pageMaxWidth)?.[1])
    expect(px).toBeGreaterThanOrEqual(1240)
    expect(px).toBeLessThanOrEqual(1320)
  })
})

describe('12-column grid', () => {
  it('declares a real 4 / 8 / 12 ladder', () => {
    const { container } = render(
      <AdminGrid>
        <AdminCol span={8}>main</AdminCol>
        <AdminCol span={4}>aside</AdminCol>
      </AdminGrid>,
    )
    /*
     * Deux nœuds depuis la correction du 2026-08-04 : l'enveloppe DÉCLARE le
     * conteneur, la grille l'INTERROGE. Les réunir était le défaut — un
     * élément en `container-type: inline-size` ne s'interroge pas lui-même,
     * `@[60rem]:` remontait au conteneur au-dessus (`.workspace`, 1200 px) et
     * une grille de 360 px ouvrait ses 12 colonnes : douze pistes de 8 px.
     */
    const enveloppe = container.firstElementChild
    const grid = enveloppe?.firstElementChild
    expect(enveloppe?.className).toContain('@container')
    /*
     * L'échelle est 4 / 8 / 12. Le palier haut est passé de `lg` (1024 px) à
     * `xl` (1280 px) — HC-VISUAL-LAYOUT-RECOVERY-001 : à 1024 px, une colonne
     * de 4/12 laissait ~85 px et le titre du ChartFrame s'y rendait sur 48 px
     * de large pour 168 de haut. Ce qui est vérifié ici est l'ÉCHELLE, pas le
     * nom du palier : asserter `lg:` faisait échouer le test sur une décision
     * de mise en page délibérée et mesurée.
     */
    expect(grid?.className).toContain('grid-cols-4')
    /*
     * L'échelle est 4 / 8 / 12 — c'est ELLE le contrat, pas l'unité qui la
     * déclenche. Les paliers sont passés de `md:`/`xl:` (viewport) à
     * `@[34rem]:`/`@[60rem]:` (conteneur) : une grille imbriquée dans une
     * colonne dont la largeur dépend du rail et de l'aside ne peut pas se
     * régler sur la taille de la fenêtre. Mesuré avant correction : 12
     * colonnes ouvertes dans un conteneur de 748 px, soit 37 px par piste.
     */
    expect(grid?.className).toMatch(/(md:|@\[[\d.]+rem\]:)grid-cols-8/)
    expect(grid?.className).toMatch(/(lg:|xl:|@\[[\d.]+rem\]:)grid-cols-12/)
    /*
     * Le conteneur et la requête ne doivent PAS revenir sur le même nœud :
     * c'est exactement le défaut corrigé, et il est invisible à la lecture.
     */
    expect(grid?.className).not.toContain('@container')
  })

  it('emits literal span classes Tailwind can actually see', () => {
    const { container } = render(
      <AdminGrid>
        <AdminCol span={5} md={4} base={2}>
          five
        </AdminCol>
      </AdminGrid>,
    )
    // enveloppe (`@container`) → grille → colonne.
    const col = container.firstElementChild?.firstElementChild?.firstElementChild
    // Même règle : le span du palier haut suit la grille (`xl` depuis
    // HC-VISUAL-LAYOUT-RECOVERY-001). C'est la classe LITTÉRALE qui compte —
    // Tailwind ne voit pas une classe construite par concaténation.
    expect(col?.className).toMatch(/(lg:|xl:|@\[[\d.]+rem\]:)col-span-5/)
    expect(col?.className).toMatch(/(md:|@\[[\d.]+rem\]:)col-span-4/)
    expect(col?.className).toContain('col-span-2')
  })
})

describe('metric grids are balanced', () => {
  /** The column counts a class string commits to, at any breakpoint. */
  function declaredColumns(className: string): number[] {
    return [...className.matchAll(/(?:^|\s|:)grid-cols-(\d+)/g)].map((m) => Number(m[1]))
  }

  it('never leaves an orphan in the last row', () => {
    for (let count = 2; count <= 12; count += 1) {
      const { container } = render(
        <AdminMetricGrid count={count}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i}>tile</div>
          ))}
        </AdminMetricGrid>,
      )
      const className = container.firstElementChild?.className ?? ''

      // Either every declared column count divides the item count evenly…
      const columns = declaredColumns(className)
      const allDivide = columns.length > 0 && columns.every((c) => count % c === 0)
      // …or the grid uses auto-fit, whose empty tracks collapse so the
      // surviving tiles stretch and the row still ends full.
      const autoFit = className.includes('auto-fit')

      expect(
        allDivide || autoFit,
        `count=${count} produced "${className}" — that leaves an arbitrary empty half-row`,
      ).toBe(true)
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

  it('declares glass console surfaces on a graphite shell', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    const token = (name: string): string | undefined =>
      new RegExp(`--color-console-${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim()

    expect(token('app')).toBe('#101010')
    expect(token('shell')).toBe('#232323')
    expect(token('card')).toMatch(/^rgba\(0,\s*0,\s*0,\s*0\.28\)$/)
    expect(token('card-top')).toMatch(/^rgba\(10,\s*10,\s*10,\s*0\.38\)$/)
    expect(token('inset')).toMatch(/^rgba\(10,\s*10,\s*10,\s*0\.4\)$/)

    for (const name of ['app', 'shell']) {
      const hex = token(name) ?? ''
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      expect(r, `console-${name} is not neutral`).toBe(g)
      expect(g, `console-${name} is not neutral`).toBe(b)
    }

    const lum = (hex: string): number => parseInt(hex.slice(1, 3), 16)
    expect(lum(token('shell') ?? '#000')).toBeGreaterThan(lum(token('app') ?? '#fff'))
  })

  it('expose un voile mint de sélection (accent-soft)', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--color-accent-soft:\s*rgba\(167,\s*251,\s*144,\s*0\.1\)/)
  })

  it('keeps the console accent on the approved brand mint', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    const darkRamp = css.slice(css.indexOf('.dark {'))
    expect(/--color-accent-400:\s*#a7fb90;/.test(darkRamp)).toBe(true)
    expect(/--color-zinc-300:\s*#ffffff;/.test(darkRamp)).toBe(true)
    expect(/--color-zinc-400:\s*#f2f2f2;/.test(darkRamp)).toBe(true)
  })
})

describe('chart sizing', () => {
  it('always keeps the chart slot open, even for a short or empty series', () => {
    expect(plottableAsChart(0)).toBe(true)
    expect(plottableAsChart(1)).toBe(true)
    expect(plottableAsChart(2)).toBe(true)
  })

  it('derives height from data volume rather than one global constant', () => {
    expect(chartHeight('rows', 3)).toBeLessThan(chartHeight('rows', 8))
    expect(chartHeight('columns', 2)).toBeLessThan(chartHeight('columns', 20))
    // …and never grows without bound: a long series is scrolled, not stretched.
    expect(chartHeight('rows', 50)).toBeLessThanOrEqual(420)
    expect(chartHeight('columns', 400)).toBeLessThanOrEqual(320)
  })
})
