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

  it('n’affiche rien sur le tableau de bord principal', () => {
    usePathname.mockReturnValue('/admin')
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).toBeNull()
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

  it('n’affiche pas de sous-menu Portfolio mono-entrée sur le Journal Série 1', () => {
    usePathname.mockReturnValue('/admin/series-1')
    const { container } = render(<AdminBodyNav />)
    expect(container.firstChild).toBeNull()
  })
})
