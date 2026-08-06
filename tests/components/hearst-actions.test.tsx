import { HearstCriticalAction, HearstPrimaryAction } from '@/components/actions'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Frontière d'actions Hearst — HC-ADMIN-DASHBOARD-UI-ASSETS-005.
 *
 * Prouve, sans backend factice, ce que le brief §8 exige : chaque bouton GÈRE
 * `disabled` (avec tooltip pour une action sans endpoint) et `loading`, puis
 * un `success` transitoire — et retombe proprement sur `error`. La primitive
 * reste Catalyst `<Button>` : ces composants ne réécrivent pas un bouton.
 */

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }
})

describe('Hearst actions boundary', () => {
  it('renders an endpoint-less action as disabled with an honest tooltip (never a dead link)', () => {
    render(<HearstPrimaryAction disabledReason="Création client non disponible côté backend">Ajouter un client</HearstPrimaryAction>)
    const btn = screen.getByRole('button', { name: /Ajouter un client/ }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('title')).toBe('Création client non disponible côté backend')
  })

  it('renders an href action as a real link to the real route', () => {
    render(<HearstCriticalAction href="/admin/vaults">Reprendre la souscription</HearstCriticalAction>)
    const link = screen.getByRole('link', { name: /Reprendre la souscription/ })
    expect(link.getAttribute('href')).toBe('/admin/vaults')
  })

  it('runs idle → loading → success for a real async action', async () => {
    let resolveFn: () => void = () => {}
    const onAction = vi.fn(() => new Promise<void>((r) => { resolveFn = r }))
    render(<HearstCriticalAction onAction={onAction} successLabel="Fait">Valider le KYC</HearstCriticalAction>)

    const btn = screen.getByRole('button', { name: /Valider le KYC/ })
    fireEvent.click(btn)

    expect(onAction).toHaveBeenCalledTimes(1)
    // loading : le bouton est désactivé pendant la promesse
    expect((screen.getByRole('button', { name: /Valider le KYC/ }) as HTMLButtonElement).disabled).toBe(true)

    resolveFn()
    // success transitoire : le libellé bascule sur successLabel
    const done = await screen.findByRole('button', { name: /Fait/ })
    expect(done).toBeDefined()
  })

  it('recovers to an interactive state when the async action rejects', async () => {
    const onAction = vi.fn(() => Promise.reject(new Error('boom')))
    render(<HearstCriticalAction onAction={onAction} successLabel="Fait">Réessayer plus tard</HearstCriticalAction>)

    const btn = screen.getByRole('button', { name: /Réessayer plus tard/ })
    fireEvent.click(btn)

    await waitFor(() => {
      const b = screen.getByRole('button', { name: /Réessayer plus tard/ }) as HTMLButtonElement
      expect(b.disabled).toBe(false)
    })
    // n'a jamais faussement affiché le succès
    expect(screen.queryByText('Fait')).toBeNull()
  })
})
