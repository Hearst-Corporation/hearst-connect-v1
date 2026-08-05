import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Frontière dataviz — HC-MUI-X-DATAVIZ-001.
 *
 * MUI X Charts est le MOTEUR de rendu, pas le système visuel du produit. Ces
 * tests verrouillent trois faits que la mission impose :
 *
 *  1. Aucune route (`src/app/**`) n'importe le moteur (`@mui/x-charts`) ni
 *     l'autre moteur (`recharts`) directement — elles passent par la frontière
 *     `@/components/charts`. (La gate `check:ui` l'impose déjà ; ce test le
 *     re-documente au niveau du code produit réel, pas d'une fixture.)
 *
 *  2. Aucune route n'importe `@mui/material` : Material UI reste une dépendance
 *     technique du moteur, jamais un système de composants dans les pages.
 *
 *  3. Aucune dépendance MUI X commerciale (`-pro` / `-premium`) n'entre par un
 *     import quelque part dans `src/`.
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

describe('frontière dataviz MUI X', () => {
  it('aucune route n’importe directement le moteur @mui/x-charts', () => {
    const fautives = routes.filter((f) =>
      importe(readFileSync(f, 'utf8'), /from\s+['"]@mui\/x-charts(?:\/[^'"]*)?['"]/),
    )
    expect(fautives).toEqual([])
  })

  it('aucune route n’importe directement recharts', () => {
    const fautives = routes.filter((f) => importe(readFileSync(f, 'utf8'), /from\s+['"]recharts(?:\/[^'"]*)?['"]/))
    expect(fautives).toEqual([])
  })

  it('aucune route n’importe @mui/material (Material n’est pas le système visuel)', () => {
    const fautives = routes.filter((f) =>
      importe(readFileSync(f, 'utf8'), /from\s+['"]@mui\/material(?:\/[^'"]*)?['"]/),
    )
    expect(fautives).toEqual([])
  })

  it('aucun import d’une dépendance MUI X commerciale (pro / premium)', () => {
    const fautives = toutSrc.filter((f) =>
      importe(readFileSync(f, 'utf8'), /from\s+['"]@mui\/x-charts-(?:pro|premium)/),
    )
    expect(fautives).toEqual([])
  })

  it('la frontière @/components/charts ré-exporte les trois nouveaux wrappers', () => {
    const index = readFileSync(join(REPO, 'src/components/charts/index.ts'), 'utf8')
    expect(index).toMatch(/HearstCourbeChart/)
    expect(index).toMatch(/HearstAllocationChart/)
    expect(index).toMatch(/HearstActivityChart/)
  })

  it('seuls les fichiers derrière la frontière importent un moteur de dataviz', () => {
    const moteur = /from\s+['"](?:@mui\/x-charts|recharts)(?:\/[^'"]*)?['"]/
    const consommateurs = toutSrc.filter((f) => importe(readFileSync(f, 'utf8'), moteur))
    // Tout consommateur de moteur vit sous src/components/charts/ — nulle part ailleurs.
    const hors = consommateurs.filter((f) => !f.includes(join('components', 'charts')))
    expect(hors).toEqual([])
  })
})
