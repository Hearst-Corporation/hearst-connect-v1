import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Preuve que la gate des frontières UI mord.
 *
 * `scripts/check-ui-boundaries.mjs` verrouille ce que HC-UI-CONVERGENCE-001 a
 * mis en place. Une gate qu'aucun test n'exerce peut devenir inopérante — regex
 * cassée, périmètre réduit — sans que rien ne le signale ; c'est exactement le
 * défaut que le LOT F avait trouvé sur `check:mocks`.
 *
 * On lance le VRAI script en sous-processus sur une racine temporaire (il
 * accepte une racine en argv[2]), donc la gate n'est pas modifiée pour être
 * testable. Les deux directions sont vérifiées : une fixture fautive doit
 * échouer, une fixture conforme doit passer. Vérifier seulement l'échec
 * laisserait passer une gate qui refuse tout.
 */

const REPO = resolve(import.meta.dirname, '..')
const GATE = join(REPO, 'scripts/check-ui-boundaries.mjs')

const temporaires: string[] = []

function racineAvec(chemin: string, contenu: string): string {
  const racine = mkdtempSync(join(tmpdir(), 'hc-ui-boundaries-'))
  temporaires.push(racine)
  const complet = join(racine, chemin)
  mkdirSync(join(complet, '..'), { recursive: true })
  writeFileSync(complet, contenu, 'utf8')
  return racine
}

function lancer(racine: string): { code: number; sortie: string } {
  try {
    return { code: 0, sortie: execFileSync('node', [GATE, racine], { encoding: 'utf8' }) }
  } catch (erreur) {
    const e = erreur as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? -1, sortie: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

afterAll(() => {
  for (const d of temporaires) rmSync(d, { recursive: true, force: true })
})

describe('check-ui-boundaries — self-test intégré', () => {
  it('passe : les fixtures positives mordent et les négatives non', () => {
    const sortie = execFileSync('node', [GATE, '--selftest'], { encoding: 'utf8' })
    expect(sortie).toContain('NO_LOCAL_PANEL')
    expect(sortie).toContain('NO_ENGINE_IN_ROUTE')
    expect(sortie).toContain('NO_DESIGN_LAB')
    expect(sortie).toContain('NO_LOCAL_CATALYST')
    expect(sortie).not.toContain('NON DÉTECTÉ')
    expect(sortie).not.toContain('FAUX POSITIF')
  })
})

describe('check-ui-boundaries — la gate mord sur du vrai code', () => {
  it.each([
    {
      label: 'une Card redéclarée dans une route',
      chemin: 'src/app/admin/x/page.tsx',
      contenu:
        'function Card({ children }: { children: React.ReactNode }) {\n  return <div>{children}</div>\n}\nexport default function Page() {\n  return <Card>x</Card>\n}\n',
      regle: 'NO_LOCAL_PANEL',
    },
    {
      label: 'un import direct de moteur de dataviz depuis une route',
      chemin: 'src/app/admin/x/page.tsx',
      contenu:
        "import { AreaChart } from 'recharts'\nexport default function Page() {\n  return <AreaChart />\n}\n",
      regle: 'NO_ENGINE_IN_ROUTE',
    },
    {
      label: 'un import depuis design-lab',
      chemin: 'src/components/x.tsx',
      contenu:
        "import { Panel } from '@/components/design-lab/legacy/primitives'\nexport const X = Panel\n",
      regle: 'NO_DESIGN_LAB',
    },
    {
      label: 'une primitive Catalyst recréée à la main',
      chemin: 'src/app/admin/x/page.tsx',
      contenu:
        'function Badge({ children }: { children: React.ReactNode }) {\n  return <span>{children}</span>\n}\nexport default Badge\n',
      regle: 'NO_LOCAL_CATALYST',
    },
  ])('refuse $label', ({ chemin, contenu, regle }) => {
    const racine = racineAvec(chemin, contenu)
    const { code, sortie } = lancer(racine)
    expect(code).toBe(1)
    expect(sortie).toContain(regle)
  })

  it('laisse passer une route conforme', () => {
    const racine = racineAvec(
      'src/app/admin/x/page.tsx',
      "import { Panel, PanelHeader } from '@/components/compositions'\n" +
        "import { ChartFrame } from '@/components/charts'\n" +
        'export default function Page() {\n  return (\n    <Panel>\n      <PanelHeader title="Titre" />\n      <ChartFrame />\n    </Panel>\n  )\n}\n',
    )
    const { code, sortie } = lancer(racine)
    expect(code).toBe(0)
    expect(sortie).toContain('Frontières UI respectées')
  })

  it('ne crie pas sur un nom qui ressemble à une primitive sans en être une', () => {
    // Le piège d'une regex trop large : ces trois formes sont légitimes.
    const racine = racineAvec(
      'src/app/admin/x/page.tsx',
      'type PanelTone = "wave" | "chart"\n' +
        'function renderCardRow(x: string) {\n  const card = x\n  return card\n}\n' +
        'export default function Page() {\n  const t: PanelTone = "wave"\n  return <div>{renderCardRow(t)}</div>\n}\n',
    )
    const { code } = lancer(racine)
    expect(code).toBe(0)
  })

  it('autorise un chart à importer son moteur : il est DERRIÈRE la frontière', () => {
    const racine = racineAvec(
      'src/components/charts/cartesian/y.tsx',
      "import { AreaChart } from 'recharts'\nexport const Y = AreaChart\n",
    )
    const { code } = lancer(racine)
    expect(code).toBe(0)
  })
})
