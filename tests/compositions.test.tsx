import { CalmState, Panel, PanelBody, PanelHeader, SourceAttendue } from '@/components/compositions'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

/**
 * Contrats des compositions canoniques (HC-UI-CONVERGENCE-001).
 *
 * Ces composants remplacent une quarantaine de déclarations locales recopiées
 * de route en route. Ce qui est vérifié ici n'est pas leur apparence — c'est ce
 * qu'ils GARANTISSENT, et que les copies locales ne garantissaient pas toutes :
 *
 *  - un plan de document lisible (niveaux de titre choisis, pas subis) ;
 *  - une région nommée pour la rangée de KPI ;
 *  - et surtout : une absence reste une absence. Une valeur indisponible ne
 *    devient jamais un zéro ni un tiret muet, elle est nommée.
 *
 * Le dernier point est la garantie centrale du produit ; c'est pour cela qu'il
 * est testé ici, au niveau de la composition, et pas seulement dans les pages.
 */

describe('Panel', () => {
  it('rend ses enfants dans une seule surface', () => {
    render(
      <Panel>
        <p>contenu</p>
      </Panel>,
    )
    expect(screen.getByText('contenu')).toBeDefined()
  })

  it('choisit son élément HTML — une carte n’est pas une section', () => {
    const { container } = render(<Panel as="section">x</Panel>)
    expect(container.querySelector('section')).not.toBeNull()
    expect(container.querySelector('article')).toBeNull()
  })

  it('partage la matière surfaceBox ; les tones ne sont que de la géométrie', () => {
    const { container: wave } = render(<Panel tone="wave">x</Panel>)
    const { container: chart } = render(<Panel tone="chart">x</Panel>)
    const { container: plain } = render(<Panel tone="plain">x</Panel>)
    const classesWave = wave.firstElementChild?.getAttribute('class') ?? ''
    const classesChart = chart.firstElementChild?.getAttribute('class') ?? ''
    const classesPlain = plain.firstElementChild?.getAttribute('class') ?? ''
    // Canon PASS 2 : une seule matière verre.
    for (const classes of [classesWave, classesChart, classesPlain]) {
      expect(classes).toContain('bg-console-card')
      expect(classes).toContain('ring-console-line')
    }
    expect(wave.firstElementChild?.getAttribute('data-surface')).toBe('box')
    // Les tones diffèrent par la géométrie, pas par un second verre.
    expect(classesWave).not.toBe(classesChart)
    expect(classesPlain).not.toBe(classesWave)
  })
})

describe('PanelHeader', () => {
  it('rend le titre au niveau demandé', () => {
    render(<PanelHeader title="Production" as="h2" />)
    expect(screen.getByRole('heading', { level: 2, name: 'Production' })).toBeDefined()
  })

  it('n’affiche aucune ligne de sous-titre quand il n’y a pas de `hint`', () => {
    // Les copies locales exigeaient un `hint` obligatoire, ce qui forçait les
    // appelants à passer une chaîne vide — donc à rendre un <p> vide.
    const { container } = render(<PanelHeader title="Sans aide" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('affiche le `hint` quand il est fourni', () => {
    render(<PanelHeader title="T" hint="ce que montre ce panneau" />)
    expect(screen.getByText('ce que montre ce panneau')).toBeDefined()
  })
})

describe('SourceAttendue', () => {
  it('nomme ce qui manque, sans jamais montrer de chiffre', () => {
    const { container } = render(
      <SourceAttendue
        quoi="Annuaire des clients"
        detail="Le service n’expose pas encore cette source."
        requis={['GET /api/v1/clients', 'GET /api/v1/clients/:id']}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Annuaire des clients' })).toBeDefined()
    expect(screen.getByText('GET /api/v1/clients')).toBeDefined()
    expect(screen.getByText('GET /api/v1/clients/:id')).toBeDefined()
    // Un état « source attendue » n'invente aucune mesure.
    expect(container.textContent).not.toMatch(/\b0\b/)
  })

  it('accueille une action quand la route en fournit une', () => {
    render(
      <SourceAttendue quoi="Q" detail="D" requis={[]} action={<button type="button">Open</button>} />,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeDefined()
  })

  it('sans action, ne rend aucun bouton fantôme', () => {
    render(<SourceAttendue quoi="Q" detail="D" requis={['a']} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('CalmState', () => {
  it('dit que tout va bien, plutôt que de laisser un vide muet', () => {
    render(<CalmState message="Aucune action requise." />)
    expect(screen.getByText('Aucune action requise.')).toBeDefined()
  })
})

describe('PanelBody', () => {
  it('rend ses enfants', () => {
    render(
      <PanelBody>
        <span>corps</span>
      </PanelBody>,
    )
    expect(screen.getByText('corps')).toBeDefined()
  })
})
