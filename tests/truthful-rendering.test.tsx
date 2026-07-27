import { DataProvenance, EmptyState, ResolvedValue, StatusBadge, UnavailableState } from '@/components/admin/truthful'
import { resolved } from '@/lib/resolved'
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
  it('affiche « Simulation backend » pour SIMULATED', () => {
    render(<StatusBadge status="SIMULATED" />)
    expect(screen.getByText('Simulation backend')).toBeDefined()
  })

  it('affiche « Source manuelle » pour manual', () => {
    render(<DataProvenance provenance="manual" />)
    expect(screen.getByText(/Source manuelle/)).toBeDefined()
  })

  it('rend une fixture backend visible, jamais silencieuse', () => {
    const { container } = render(<DataProvenance provenance="fixture" />)
    expect(container.textContent).toMatch(/Fixture backend/)
    // Marquage voyant : la fixture ne se fond pas dans le texte neutre.
    expect(container.querySelector('.text-warning-700')).not.toBeNull()
  })
})

describe('les états sont distincts les uns des autres', () => {
  it('EMPTY est une réponse réussie sans contenu, pas une erreur', () => {
    render(<EmptyState />)
    expect(screen.getByText('Réponse vide')).toBeDefined()
    expect(screen.queryByText('Erreur')).toBeNull()
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
    const { container } = render(<UnavailableState state={resolved.unavailable('Backend injoignable.')} />)
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
