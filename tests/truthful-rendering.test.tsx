import {
  DataProvenance,
  EmptyState,
  ResolvedValue,
  StatusBadge,
  UnavailableState,
} from '@/components/admin/truthful'
import { MarketSnapshotPanel } from '@/components/admin/dashboard/market-panel'
import { DataHealthGrid } from '@/components/admin/dashboard/data-health-grid'
import { resolved } from '@/lib/resolved'
import { available } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('null ne devient jamais zéro', () => {
  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY])('rend « — » pour %s', (value) => {
    const { container } = render(<ResolvedValue value={value as number | null} />)
    expect(container.textContent).toBe('—')
    expect(container.textContent).not.toContain('0')
  })

  it('rend bien 0 quand le backend a confirmé zéro', () => {
    const { container } = render(<ResolvedValue value={0} />)
    expect(container.textContent).toContain('0')
  })

  it('n’affiche pas d’unité quand la valeur est absente', () => {
    const { container } = render(<ResolvedValue value={null} unit="BTC" />)
    expect(container.textContent).toBe('—')
    expect(container.textContent).not.toContain('BTC')
  })
})

describe('étiquetage des provenances non live', () => {
  it('affiche « Simulé (backend) » pour SIMULATED', () => {
    render(<StatusBadge status="SIMULATED" />)
    expect(screen.getByText('Simulated (backend)')).toBeDefined()
  })

  it('affiche « Source manuelle » pour manual', () => {
    render(<DataProvenance provenance="manual" />)
    expect(screen.getByText(/Manual source/)).toBeDefined()
  })

  it('rend une fixture backend visible, jamais silencieuse', () => {
    const { container } = render(<DataProvenance provenance="fixture" />)
    expect(container.textContent).toMatch(/Backend fixture/)

    /*
     * Marquage voyant : la fixture ne se fond pas dans le texte neutre.
     *
     * Ce qui est vérifié est le CONTRAT — « cette provenance porte la couleur
     * d'avertissement » — et non un nom de classe précis. L'assertion visait
     * `.text-hearst-warn` ; le token a été renommé en `warning-400` au LOT E
     * (même valeur #fb923c, famille sémantique canonique), et le test tombait
     * alors que le comportement n'avait pas bougé. Il accepte désormais la
     * famille d'avertissement, quel que soit son palier, et refuse toujours un
     * rendu en texte neutre.
     */
    const marqueur = container.querySelector('[class*="text-warning-"]')
    expect(marqueur).not.toBeNull()
  })
})

describe('les états sont distincts les uns des autres', () => {
  it('EMPTY est une réponse réussie sans contenu, pas une erreur', () => {
    render(<EmptyState />)
    expect(screen.getByText('Empty response')).toBeDefined()
    expect(screen.queryByText('Error')).toBeNull()
  })

  it('NOT_CONFIGURED, UNAVAILABLE et PERMISSION_DENIED portent trois libellés distincts', () => {
    const labels = ['NOT_CONFIGURED', 'UNAVAILABLE', 'PERMISSION_DENIED'].map((status) => {
      const { container, unmount } = render(<StatusBadge status={status as 'UNAVAILABLE'} />)
      const text = container.textContent ?? ''
      unmount()
      return text
    })
    expect(new Set(labels).size).toBe(3)
  })

  it('un état sans donnée n’affiche aucun chiffre', () => {
    const { container } = render(<UnavailableState state={resolved.unavailable('Backend unreachable.')} />)
    expect(container.textContent).not.toMatch(/(^|\s)\d+([.,]\d+)?(\s|$)/)
  })

  it('expose la route et le requestId pour le support', () => {
    render(
      <UnavailableState
        state={resolved.unavailable('Injoignable.', { route: '/api/v1/vault', requestId: 'req-77' })}
      />,
    )
    expect(screen.getByText(/\/api\/v1\/vault/)).toBeDefined()
    expect(screen.getByText(/req-77/)).toBeDefined()
  })
})

// HC-028 P2 : une chaîne de variation vide ne devient jamais « 0 % » (Number('') === 0).
describe('MarketSnapshotPanel — une variation vide reste absente', () => {
  const base = {
    btcUsd: '65000',
    hashprice: null,
    hashpriceChangePct: null,
    difficulty: null,
    energyCostUsdKwh: null,
    miningMarginScore: null,
    provider: null,
    asOf: null,
  }

  it('n’affiche pas « 0% 24h » quand btcChange24hPct est une chaîne vide', () => {
    const snapshot = available({ ...base, btcChange24hPct: '' })
    const { container } = render(<MarketSnapshotPanel snapshot={snapshot} />)
    expect(container.textContent).not.toContain('24h')
    expect(container.textContent).not.toMatch(/0\s*%/)
  })

  it('affiche bien la variation quand le backend fournit un nombre réel', () => {
    const snapshot = available({ ...base, btcChange24hPct: '2.5' })
    const { container } = render(<MarketSnapshotPanel snapshot={snapshot} />)
    expect(container.textContent).toContain('24h')
  })
})

// HC-028 P2 : la fraîcheur inconnue reste « — » et ne laisse pas fuiter le statut brut.
describe('DataHealthGrid — fraîcheur absente ne fuit pas le statut', () => {
  it('rend « — » (jamais le statut brut) quand asOf est absent', () => {
    const sources = available([
      { key: 'market', label: 'Market', status: 'NOT_CONFIGURED', asOf: null, freshnessSeconds: null },
    ] as const)
    const { container } = render(<DataHealthGrid sources={sources} />)
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toContain('NOT_CONFIGURED')
  })
})
