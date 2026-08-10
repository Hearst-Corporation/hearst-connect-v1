import { Reading } from '@/components/layout/console'
import { readableReason } from '@/lib/movements'
import { unavailable } from '@/lib/vaults/model'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

describe('readableReason — pocket shares', () => {
  it('renders deployed-capital pocket reasons in English', () => {
    expect(readableReason('some_pocket_shares_unreadable')).toMatch(/vault pockets/)
    expect(readableReason('no_pocket_share_readable')).toMatch(/vault pocket/)
  })
})

describe('Reading / Absent', () => {
  it('never shows a snake_case code under Unavailable', () => {
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
    expect(screen.getByText('Unavailable')).toBeTruthy()
    expect(screen.queryByText(/some_pocket_shares_unreadable/)).toBeNull()
    expect(screen.getByText(/vault pockets/)).toBeTruthy()
  })

  it('does not leak an unknown reason', () => {
    render(
      <Reading
        value={unavailable({ reason: 'totally_unknown_backend_code_xyz' })}
        showRoute
      />,
    )
    expect(screen.getByText('Unavailable')).toBeTruthy()
    expect(screen.queryByText(/totally_unknown_backend_code_xyz/)).toBeNull()
  })
})
