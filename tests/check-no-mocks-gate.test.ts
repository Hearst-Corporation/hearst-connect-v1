import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Preuve que la gate anti-données-simulées MORD.
 *
 * `tests/fixtures/violating-module.txt` affirmait depuis sa création prouver
 * que la règle `DECLARED_FIXTURE` casse vraiment — sans qu'aucun test ne la
 * charge. Une preuve que personne n'exécute n'est pas une preuve : la règle
 * pouvait devenir inopérante (regex cassée, périmètre réduit) sans que rien
 * ne le signale. C'est ce trou que ce fichier ferme.
 *
 * ── Comment la preuve est faite ───────────────────────────────────────────
 * On lance le VRAI script `scripts/check-no-mocks.mjs`, en sous-processus,
 * sur une racine temporaire dont on contrôle le contenu. Le script accepte
 * une racine en argument (`process.argv[2]`), ce qui permet de l'exercer sans
 * le modifier et sans dépendre de l'état du dépôt.
 *
 * Deux directions, parce qu'une seule ne prouverait rien :
 *  - la fixture FAUTIVE doit faire sortir le script en échec (exit 1) ;
 *  - une fixture PROPRE doit le laisser passer (exit 0).
 * Un test qui ne vérifierait que le premier cas passerait encore si la gate
 * refusait tout, y compris le code légitime.
 *
 * La fixture n'est pas recopiée ici : elle est LUE depuis `tests/fixtures/`,
 * donc c'est bien elle qui est mise à l'épreuve. Elle est écrite en `.txt`
 * pour que la gate ne la voie pas lors d'un scan normal du dépôt ; on la
 * dépose en `.ts` dans la racine temporaire, sous `src/lib/`, c'est-à-dire
 * dans le périmètre réellement scanné.
 */

const REPO = resolve(import.meta.dirname, '..')
const GATE = join(REPO, 'scripts/check-no-mocks.mjs')
const FIXTURE = join(REPO, 'tests/fixtures/violating-module.txt')

const temporaires: string[] = []

/** Racine jetable contenant un seul module runtime, sous `src/lib/`. */
function racineAvec(contenu: string): string {
  const racine = mkdtempSync(join(tmpdir(), 'hc-check-no-mocks-'))
  temporaires.push(racine)
  mkdirSync(join(racine, 'src/lib'), { recursive: true })
  writeFileSync(join(racine, 'src/lib/module-sous-test.ts'), contenu, 'utf8')
  return racine
}

/** Lance la gate sur une racine et rend son code de sortie + sa sortie texte. */
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

describe('check-no-mocks — la gate mord (DECLARED_FIXTURE)', () => {
  it('la fixture fautive de tests/fixtures fait échouer la gate', () => {
    const fixture = readFileSync(FIXTURE, 'utf8')

    // La fixture doit rester fautive : si quelqu'un l'assainit, ce test doit
    // le dire plutôt que de passer au vert en n'éprouvant plus rien.
    expect(fixture).toMatch(/\bconst\s+mockData\s*=/)

    const { code, sortie } = lancerGate(racineAvec(fixture))

    expect(code).toBe(1)
    expect(sortie).toContain('DECLARED_FIXTURE')
    expect(sortie).toContain('module-sous-test.ts')
  })

  it('un module runtime légitime laisse la gate passer', () => {
    const propre = [
      "import { formatNumber } from '@/lib/format'",
      '',
      'export function total(valeurs: readonly number[]): string {',
      '  return formatNumber(valeurs.reduce((a, b) => a + b, 0))',
      '}',
      '',
    ].join('\n')

    const { code, sortie } = lancerGate(racineAvec(propre))

    expect(code).toBe(0)
    expect(sortie).toContain('Aucune donnée simulée')
  })

  it('signale une absence rendue comme un zéro (NULL_TO_ZERO)', () => {
    // Deuxième règle éprouvée, parce que c'est celle qui porte la garantie
    // centrale du produit : une valeur absente ne vaut pas zéro.
    const fautif = [
      'export function compte(valeur: number | null): number {',
      '  return valeur ?? 0',
      '}',
      '',
    ].join('\n')

    const { code, sortie } = lancerGate(racineAvec(fautif))

    expect(code).toBe(1)
    expect(sortie).toContain('NULL_TO_ZERO')
  })
})
