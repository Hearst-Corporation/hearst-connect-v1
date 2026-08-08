import { AdminReading } from '@/components/admin/reading'
import { Reading } from '@/components/layout/console'
import { available, editorial, unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('Live badge / three states', () => {
  it('AdminReading shows the badge for a LIVE reading', () => {
    render(<AdminReading value={available('127', { provenance: 'indexed' })} />)
    const badge = screen.getByText('Live')
    expect(badge.closest('[data-live-badge]')).not.toBeNull()
    expect(badge.className).toMatch(/green/)
  })

  it('Reading shows the badge for a LIVE reading', () => {
    render(<Reading value={available('3', { provenance: 'indexed' })} />)
    expect(screen.getByText('Live').closest('[data-live-badge]')).not.toBeNull()
  })

  it('does not show the badge for an editorial value', () => {
    render(<AdminReading value={editorial('OWNER')} />)
    expect(screen.queryByText('Live')).toBeNull()
  })

  it('does not show the badge for an OFFLINE absence', () => {
    render(<AdminReading value={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(screen.queryByText('Live')).toBeNull()
  })

  it('shows Issue for a STALE reading, not Live', () => {
    render(<AdminReading value={available('42', { provenance: 'indexed', stale: true })} />)
    expect(screen.getByText('Issue')).toBeDefined()
    expect(screen.queryByText('Live')).toBeNull()
  })
})
