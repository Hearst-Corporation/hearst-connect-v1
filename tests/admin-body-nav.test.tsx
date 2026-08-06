import { AdminBodyNav } from '@/components/admin/body-nav'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const usePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}))

describe('AdminBodyNav', () => {
  beforeEach(() => {
    usePathname.mockReset()
  })

  it('n’affiche rien sur un écran principal sans sous-menu', () => {
    usePathname.mockReturnValue('/admin/operations')
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).toBeNull()
  })

  it('n’affiche rien sur une section dont le groupe ne porte qu’une entrée', () => {
    usePathname.mockReturnValue('/admin/runtime')
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche le sous-menu Portfolio sur le Journal Série 1', () => {
    usePathname.mockReturnValue('/admin/series-1')
    render(<AdminBodyNav />)
    expect(screen.getByLabelText('Sous-navigation')).toBeTruthy()
    expect(screen.getByText('Journal Série 1')).toBeTruthy()
    expect(screen.getByText('Pilotage des souscriptions')).toBeTruthy()
  })

  it('affiche le sous-menu Portfolio aussi sur le pilotage (plus de cul-de-sac)', () => {
    usePathname.mockReturnValue('/admin/dashboard')
    render(<AdminBodyNav />)
    expect(screen.getByLabelText('Sous-navigation')).toBeTruthy()
    expect(screen.getByText('Journal Série 1')).toBeTruthy()
    expect(screen.getByText('Pilotage des souscriptions')).toBeTruthy()
  })
})
