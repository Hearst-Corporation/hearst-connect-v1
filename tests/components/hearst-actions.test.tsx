import {
  HearstCriticalAction,
  HearstDangerAction,
  HearstPrimaryAction,
  HearstSecondaryAction,
} from '@/components/actions'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * Frontière d'actions Hearst — HC-ADMIN-DASHBOARD-UI-ASSETS-005 /
 * HC-ADMIN-DESIGN-SYSTEM-FORENSIC-033.
 *
 * Prouve : états async + contrat couleur (variables accent, jamais lime raw).
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

function classOf(el: HTMLElement): string {
  return el.className ?? ''
}

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
    expect((screen.getByRole('button', { name: /Valider le KYC/ }) as HTMLButtonElement).disabled).toBe(true)

    resolveFn()
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
    expect(screen.queryByText('Fait')).toBeNull()
  })

  it('primary CTA emits accent CSS vars and never lime raw classes', () => {
    render(<HearstPrimaryAction href="/admin/clients">Add client</HearstPrimaryAction>)
    const link = screen.getByRole('link', { name: /Add client/ })
    const cls = classOf(link)
    const style = link.getAttribute('style') ?? ''

    expect(style).toContain('--btn-bg: var(--color-accent-400)')
    expect(style).toContain('--btn-border: var(--color-accent-500)')
    expect(cls).toMatch(/outline-accent-500/)
    expect(cls).not.toMatch(/lime-/)
    expect(cls).not.toMatch(/\[--btn-bg:var\(--color-lime/)
  })

  it('danger CTA uses danger tokens without red-* Tailwind utilities', () => {
    render(<HearstDangerAction href="/admin/runtime">Escalate</HearstDangerAction>)
    const link = screen.getByRole('link', { name: /Escalate/ })
    const cls = classOf(link)
    const style = link.getAttribute('style') ?? ''

    expect(style).toContain('--btn-bg: var(--color-danger-600)')
    expect(cls).not.toMatch(/\bred-\d/)
    expect(cls).not.toMatch(/\[--btn-bg:var\(--color-red/)
  })

  it('secondary keeps white structural Catalyst color (no status palette)', () => {
    render(<HearstSecondaryAction href="/admin">Cancel</HearstSecondaryAction>)
    const link = screen.getByRole('link', { name: /Cancel/ })
    const cls = classOf(link)
    expect(cls).toMatch(/outline-accent-500/)
    // Vendor may still list outline-blue-500; product override + CSS remap win at runtime.
    expect(cls).not.toMatch(/lime-|amber-|\[--btn-bg:var\(--color-(?:lime|amber|red|rose)/)
  })
})
