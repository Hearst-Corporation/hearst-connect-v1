import { Reading } from '@/components/layout/console'
import { motifLisible } from '@/lib/mouvements'
import { unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('motifLisible — parts de poches', () => {
  it('traduit les motifs capital déployé en français', () => {
    expect(motifLisible('some_pocket_shares_unreadable')).toMatch(/poches/)
    expect(motifLisible('no_pocket_share_readable')).toMatch(/poche/)
  })
})

describe('Reading / Absent', () => {
  it('n’affiche jamais un code snake_case sous Indisponible', () => {
    render(
      <Reading
        value={unavailable({
          endpoint: '/api/v1/vault',
          status: 'PARTIAL',
          reason: 'some_pocket_shares_unreadable',
        })}
        showRoute
      />,
    )
    expect(screen.getByText('Indisponible')).toBeTruthy()
    expect(screen.queryByText(/some_pocket_shares_unreadable/)).toBeNull()
    expect(screen.getByText(/poches/)).toBeTruthy()
  })

  it('ne fuit pas un motif inconnu', () => {
    render(
      <Reading
        value={unavailable({ reason: 'totally_unknown_backend_code_xyz' })}
        showRoute
      />,
    )
    expect(screen.getByText('Indisponible')).toBeTruthy()
    expect(screen.queryByText(/totally_unknown_backend_code_xyz/)).toBeNull()
  })
})
