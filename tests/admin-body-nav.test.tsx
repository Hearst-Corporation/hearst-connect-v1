import { AdminBodyNav } from '@/components/admin/body-nav'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const usePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => usePathname(),
}))

describe('AdminBodyNav', () => {
  beforeEach(() => {
    usePathname.mockReset()
  })

  it.each([
    { pathname: '/admin', label: 'le tableau de bord principal' },
    { pathname: '/admin/operations', label: 'un écran principal sans sous-menu' },
    { pathname: '/admin/product', label: 'une section dont le groupe ne porte qu’une entrée' },
    { pathname: '/admin/series-1', label: 'Portfolio mono-entrée sur le Journal Série 1' },
  ])('n’affiche rien sur $label', ({ pathname }) => {
    usePathname.mockReturnValue(pathname)
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).toBeNull()
  })

  it('affiche la sous-nav horizontale sur une section multi-entrée (Service)', () => {
    usePathname.mockReturnValue('/admin/runtime')
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).not.toBeNull()
  })
})
