import { AdminReading } from '@/components/admin/reading'
import { Reading } from '@/components/layout/console'
import { available, editorial, unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('badge « En direct » / trois états', () => {
  it('AdminReading affiche le badge pour une lecture EN_DIRECT', () => {
    render(<AdminReading value={available('127', { provenance: 'indexed' })} />)
    const badge = screen.getByText('En direct')
    expect(badge.closest('[data-live-badge]')).not.toBeNull()
    expect(badge.className).toMatch(/green/)
  })

  it('Reading affiche le badge pour une lecture EN_DIRECT', () => {
    render(<Reading value={available('3', { provenance: 'indexed' })} />)
    expect(screen.getByText('En direct').closest('[data-live-badge]')).not.toBeNull()
  })

  it('n’affiche pas le badge pour une valeur éditoriale', () => {
    render(<AdminReading value={editorial('OWNER')} />)
    expect(screen.queryByText('En direct')).toBeNull()
  })

  it('n’affiche pas le badge pour une absence HORS_LIGNE', () => {
    render(<AdminReading value={unavailable({ status: 'UNAVAILABLE' })} />)
    expect(screen.queryByText('En direct')).toBeNull()
  })

  it('affiche « Problème » pour une lecture STALE, pas « En direct »', () => {
    render(<AdminReading value={available('42', { provenance: 'indexed', stale: true })} />)
    expect(screen.getByText('Problème')).toBeDefined()
    expect(screen.queryByText('En direct')).toBeNull()
  })
})
