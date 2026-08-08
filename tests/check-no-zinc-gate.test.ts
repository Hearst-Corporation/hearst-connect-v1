import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const REPO = resolve(import.meta.dirname, '..')
const GATE = join(REPO, 'scripts/check-no-zinc.mjs')

const temporaires: string[] = []

function racineAvec(fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), 'hc-check-no-zinc-'))
  temporaires.push(racine)
  for (const [rel, contenu] of Object.entries(fichiers)) {
    const full = join(racine, rel)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, contenu, 'utf8')
  }
  return racine
}

function lancerGate(racine: string): { code: number; sortie: string } {
  try {
    const sortie = execFileSync('node', [GATE, racine], { encoding: 'utf8' })
    return { code: 0, sortie }
  } catch (erreur) {
    const e = erreur as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? -1, sortie: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

afterAll(() => {
  for (const dossier of temporaires) rmSync(dossier, { recursive: true, force: true })
})

describe('check-no-zinc — zinc and structural neutral ramps', () => {
  it('selftest passes', () => {
    const sortie = execFileSync('node', [GATE, '--selftest'], { encoding: 'utf8' })
    expect(sortie).toContain('selftest OK')
  })

  it('flags zinc utilities and color="zinc"', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/components/chart.tsx': `export const c = 'text-zinc-500 ring-zinc-950/10'\n`,
        'src/components/badge.tsx': `<Badge color="zinc" />\n`,
      }),
    )
    expect(code).toBe(1)
    expect(sortie).toContain('[ZINC]')
  })

  it('flags --color-zinc-* CSS variables', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/styles/extra.css': ':root { --color-zinc-500: #71717a; }\n',
      }),
    )
    expect(code).toBe(1)
    expect(sortie).toContain('[ZINC]')
  })

  it('flags slate|gray|neutral shade ramps', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/components/card.tsx': `export const c = 'bg-slate-900 text-gray-400 border-neutral-200'\n`,
      }),
    )
    expect(code).toBe(1)
    expect(sortie).toContain('[STRUCTURAL_NEUTRAL]')
  })

  it('allows Hearst semantic tokens', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/components/card.tsx': `export const c = 'bg-console-surface text-fg-secondary'\n`,
      }),
    )
    expect(code).toBe(0)
    expect(sortie).toContain('check-no-zinc OK')
  })
})
