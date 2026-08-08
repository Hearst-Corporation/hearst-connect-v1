import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

/** Surfaces vitrine marketing (landing server-rendered, no separate ui/ primitives). */
const SCOPES = ['src/app/(marketing)', 'src/components/marketing'] as const

/** Tailwind structural neutrals (shade ramps) — see pnpm run check:no-zinc for the primary ban. */
const FORBIDDEN = /\b(neutral|slate|gray)-\d{2,3}\b/

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

describe('vitrine marketing — pas de rampes Tailwind structurelles', () => {
  it('aucun neutral|slate|gray-* dans marketing', () => {
    const offenders: string[] = []
    for (const scope of SCOPES) {
      const root = join(ROOT, scope)
      if (!existsSync(root)) continue
      for (const file of collectFiles(root)) {
        const src = readFileSync(file, 'utf8')
        if (FORBIDDEN.test(src)) {
          offenders.push(file.replace(ROOT + '/', ''))
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('le layout racine utilise bg-console-app', () => {
    const layout = readFileSync(join(ROOT, 'src/app/layout.tsx'), 'utf8')
    expect(layout).toContain('bg-console-app')
  })
})
