import { AdminMetric, AdminSurface } from '@/components/admin/surfaces'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('composants admin surfaces', () => {
  it('AdminMetric affiche — pour valeur absente', () => {
    render(<AdminMetric label="Encours" value={null} />)
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })

  it('AdminMetric affiche une valeur réelle', () => {
    render(<AdminMetric label="Encours" value="1 234 $" unit="USDC" />)
    expect(screen.getByText('1 234 $')).toBeTruthy()
  })

  it('AdminSurface rend un conteneur', () => {
    render(
      <AdminSurface padding>
        <span>contenu</span>
      </AdminSurface>,
    )
    expect(screen.getByText('contenu')).toBeTruthy()
  })
})
