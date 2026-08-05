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

  it('affiche les sous-menus horizontaux d’une section active', () => {
    usePathname.mockReturnValue('/admin/runtime')
    render(<AdminBodyNav />)

    const nav = screen.getByRole('navigation', { name: 'Sous-navigation' })
    expect(nav).toBeTruthy()
    expect(screen.getByRole('link', { name: 'État du service' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Couverture des données' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Accueil' })).toBeNull()
  })
})
