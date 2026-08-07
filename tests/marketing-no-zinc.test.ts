import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

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

describe('vitrine marketing — pas de zinc', () => {
  it('aucun zinc dans (marketing)/ + components/marketing/', () => {
    const scopes = [
      join(ROOT, 'src/app/(marketing)'),
      join(ROOT, 'src/components/marketing'),
    ]
    const offenders: string[] = []
    for (const scope of scopes) {
      for (const file of collectFiles(scope)) {
        const src = readFileSync(file, 'utf8')
        if (/\bzinc\b/.test(src)) offenders.push(file.replace(ROOT + '/', ''))
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
