import { CockpitPage } from '@/components/compositions/cockpit-page'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

describe('CockpitPage', () => {
  it('expose le slot graphique principal et sépare le contexte latéral', () => {
    const html = renderToStaticMarkup(
      <CockpitPage
        header={<h1>En-tête</h1>}
        kpis={<div data-testid="kpis">KPIs</div>}
        primaryChart={<div data-testid="chart">Graphique</div>}
        aside={<div data-testid="aside">Contexte</div>}
      >
        <div data-testid="below">Suite</div>
      </CockpitPage>,
    )

    expect(html).toContain('data-cockpit-chart="primary"')
    expect(html.indexOf('data-testid="chart"')).toBeLessThan(html.indexOf('data-testid="aside"'))
    expect(html).toContain('data-testid="below"')
  })
})
