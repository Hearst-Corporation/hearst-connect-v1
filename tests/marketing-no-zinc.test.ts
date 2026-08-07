import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

/** Surfaces vitrine + primitives Aceternity consommées par la landing. */
const SCOPES = [
  'src/app/(marketing)',
  'src/components/marketing',
  'src/components/ui',
] as const

const FORBIDDEN = /\b(zinc|neutral|slate|gray)-\d{2,3}\b|\bbg-zinc\b|\btext-zinc\b|\bborder-zinc\b|\bring-zinc\b|\bfrom-zinc\b|\bto-zinc\b|\bvia-zinc\b/

function collectFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...collectFiles(full))
    else if (/\.(tsx|ts|css)$/.test(entry.name)) files.push(full)
  }
  return files
}

describe('vitrine marketing — pas de zinc / gris Tailwind', () => {
  it('aucun zinc|neutral|slate|gray-* dans marketing + ui', () => {
    const offenders: string[] = []
    for (const scope of SCOPES) {
      for (const file of collectFiles(join(ROOT, scope))) {
        const src = readFileSync(file, 'utf8')
        if (FORBIDDEN.test(src) || /\bzinc\b/.test(src)) {
          offenders.push(file.replace(ROOT + '/', ''))
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('le layout racine n’utilise pas bg-zinc-*', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')
    expect(layout).not.toMatch(/bg-zinc-/)
    expect(layout).toContain('bg-console-app')
  })
})
