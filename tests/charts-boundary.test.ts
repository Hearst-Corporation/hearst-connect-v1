import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Frontière dataviz — richart (ex-MUI X).
 *
 *  1. Aucune route n'importe le moteur (`recharts`) directement.
 *  2. Aucun import MUI Charts / Material dans `src/`.
 *  3. Les charts métier passent par `@/components/charts`.
 */

const REPO = resolve(import.meta.dirname, '..')

function fichiers(racine: string): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full)
      else if (/\.(ts|tsx)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) out.push(full)
    }
  }
  walk(racine)
  return out
}

const routes = fichiers(join(REPO, 'src/app'))
const toutSrc = fichiers(join(REPO, 'src'))

function importe(source: string, motif: RegExp): boolean {
  return motif.test(source)
}

describe('frontière dataviz richart', () => {
  it('aucune route n’importe directement recharts', () => {
    const fautives = routes.filter((f) => importe(readFileSync(f, 'utf8'), /from\s+['"]recharts(?:\/[^'"]*)?['"]/))
    expect(fautives).toEqual([])
  })

  it('aucun import @mui/x-charts ou @mui/material dans src/', () => {
    const fautives = toutSrc.filter((f) =>
      importe(readFileSync(f, 'utf8'), /from\s+['"]@mui\/(?:x-charts|material)(?:\/[^'"]*)?['"]/),
    )
    expect(fautives).toEqual([])
  })

  it('la frontière ré-exporte les wrappers richart', () => {
    const index = readFileSync(join(REPO, 'src/components/charts/index.ts'), 'utf8')
    expect(index).toMatch(/HearstCourbeChart/)
    expect(index).toMatch(/HearstAllocationChart/)
    expect(index).toMatch(/HearstActivityChart/)
    expect(index).toMatch(/RichSparkline/)
    expect(index).toMatch(/RichDistributionChart/)
    expect(index).toMatch(/richart/)
  })

  it('seuls les fichiers derrière la frontière importent recharts', () => {
    const moteur = /from\s+['"]recharts(?:\/[^'"]*)?['"]/
    const consommateurs = toutSrc.filter((f) => importe(readFileSync(f, 'utf8'), moteur))
    const hors = consommateurs.filter((f) => !f.includes(join('components', 'charts')))
    expect(hors).toEqual([])
  })
})
