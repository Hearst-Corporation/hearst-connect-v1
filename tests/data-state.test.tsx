import { DataState, StatusBadge } from '@/components/data-state'
import { resolved } from '@/lib/resolved'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('rendu des états sans donnée', () => {
  it('NOT_CONFIGURED affiche « Source non configurée » et la raison backend', () => {
    render(<DataState state={resolved.notConfigured('Aucune route de gestion d’accès.', { route: '/api/v1/x' })} />)

    expect(screen.getByText('Source non configurée')).toBeDefined()
    expect(screen.getByText(/Aucune route de gestion d’accès/)).toBeDefined()
  })

  it('UNAVAILABLE affiche l’indisponibilité et le requestId pour le support', () => {
    render(
      <DataState
        state={resolved.unavailable('Backend injoignable.', { route: '/api/v1/btc', requestId: 'req-42' })}
      />,
    )

    expect(screen.getByText('Données temporairement indisponibles')).toBeDefined()
    expect(screen.getByText(/req-42/)).toBeDefined()
  })

  it('PERMISSION_DENIED n’est pas rendu comme un état vide', () => {
    render(<DataState state={resolved.permissionDenied('Rôle administrateur requis.')} />)

    expect(screen.getByText('Autorisation insuffisante')).toBeDefined()
    expect(screen.queryByText('Aucun résultat')).toBeNull()
  })

  it('un état sans donnée n’affiche jamais de chiffre', () => {
    const { container } = render(<DataState state={resolved.unavailable('Indisponible.')} />)
    // Aucun nombre isolé ne doit apparaître : ni 0, ni compteur de remplacement.
    expect(container.textContent).not.toMatch(/(^|\s)\d+([.,]\d+)?(\s|$)/)
  })

  it('EMPTY affiche « Aucun résultat », distinct d’une erreur', () => {
    render(<DataState state={resolved.empty({ route: '/api/v1/members' })} />)

    expect(screen.getByText('Aucun résultat')).toBeDefined()
    expect(screen.queryByText('Erreur')).toBeNull()
  })

  it('LIVE ne rend aucun bloc d’état — la place revient à la donnée', () => {
    const { container } = render(<DataState state={resolved.live([1, 2], { route: '/api/v1/x' })} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('pastille de statut', () => {
  it('reste muette en LIVE', () => {
    const { container } = render(<StatusBadge state={resolved.live(1, {})} />)
    expect(container.firstChild).toBeNull()
  })

  it('signale une fraîcheur insuffisante en STALE', () => {
    render(<StatusBadge state={resolved.stale(1, 'ancien', {})} />)
    expect(screen.getByText('Fraîcheur insuffisante')).toBeDefined()
  })

  it('signale une donnée simulée', () => {
    render(<StatusBadge state={{ status: 'SIMULATED', value: null, reason: null, provenance: { route: null, field: null, fetchedAt: null, requestId: null } }} />)
    expect(screen.getByText('Simulé')).toBeDefined()
  })
})
