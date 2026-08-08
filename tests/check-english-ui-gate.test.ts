import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const REPO = resolve(import.meta.dirname, '..')
const GATE = join(REPO, 'scripts/check-english-ui.mjs')

const temporaires: string[] = []

function racineAvec(fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), 'hc-check-english-ui-'))
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

describe('check-english-ui — case-insensitive French UI copy', () => {
  it('selftest passes', () => {
    const sortie = execFileSync('node', [GATE, '--selftest'], { encoding: 'utf8' })
    expect(sortie).toContain('selftest OK')
  })

  it('detects lowercase French in JSX text', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/components/panel.tsx': `export function P() { return <button>se déconnecter</button> }\n`,
      }),
    )
    expect(code).toBe(1)
    expect(sortie).toContain('Se déconnecter')
  })

  it('detects lowercase French in string literals', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/lib/labels.ts': `export const title = 'tableau de bord'\n`,
      }),
    )
    expect(code).toBe(1)
    expect(sortie).toContain('Tableau de bord')
  })

  it('allows English UI copy', () => {
    const { code, sortie } = lancerGate(
      racineAvec({
        'src/components/panel.tsx': `export function P() { return <p>Unavailable</p> }\n`,
      }),
    )
    expect(code).toBe(0)
    expect(sortie).toContain('check-english-ui OK')
  })
})
