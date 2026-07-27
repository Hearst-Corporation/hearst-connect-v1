import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

const runtimeFiles = ['src/app', 'src/components', 'src/lib'].flatMap((d) => walk(join(ROOT, d)))
const sources = runtimeFiles.map((f) => ({ path: f.replace(`${ROOT}/`, ''), code: readFileSync(f, 'utf8') }))

describe('aucune fixture runtime', () => {
  it("aucune page n'importe de fixture ni de jeu de démonstration", () => {
    const offenders = sources
      .filter(({ code }) => /from\s+['"][^'"]*(demo-data|mock|fixture|sample-data|testData)/.test(code))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('aucun graphique ne tire ses points au hasard', () => {
    const offenders = sources.filter(({ code }) => /Math\.random\s*\(/.test(code)).map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it("aucune page du dashboard ne code en dur de valeur financière ou d'adresse", () => {
    const offenders = sources
      .filter(({ path }) => path.includes('dashboard'))
      .filter(({ code }) => /0x[a-fA-F0-9]{20,}|\d+([.,]\d+)?\s*(BTC|USDC|ETH)\b/.test(code))
      .map(({ path }) => path)
    expect(offenders).toEqual([])
  })

  it('les modules de démonstration ont bien été supprimés du dépôt', () => {
    const paths = sources.map((s) => s.path)
    expect(paths).not.toContain('src/lib/demo-data.ts')
    expect(paths).not.toContain('src/components/demo-notice.tsx')
  })
})

describe('gate anti-mock', () => {
  it('le gate se termine en succès sur le dépôt courant', () => {
    const output = execFileSync('node', ['scripts/check-no-mocks.mjs'], { cwd: ROOT, encoding: 'utf8' })
    expect(output).toContain('Aucune donnée simulée')
  })

  it('le gate échoue si une fixture est réintroduite', () => {
    // On vérifie que le gate mord réellement, sinon son vert ne prouve rien.
    const fixture = resolve(import.meta.dirname, 'fixtures/violating-module.txt')
    const code = readFileSync(fixture, 'utf8')
    expect(/\b(?:const|let|var)\s+\w*(?:mockData|fixtures?|demoData)\w*\s*[:=]/.test(code)).toBe(true)
  })
})
