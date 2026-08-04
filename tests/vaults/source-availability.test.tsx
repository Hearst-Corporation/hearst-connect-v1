import { render } from '@testing-library/react'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import { available, unavailable } from '@/lib/vaults/model'
import { describe, expect, it } from 'vitest'

/**
 * Protection tests for the source availability badge.
 *
 * The badge is the one place that renders an absence as a word rather than a
 * dash or a zero. These tests pin every state and size so the refactor can
 * split the component into helpers without changing what the reader sees.
 */

describe('SourceAvailabilityBadge', () => {
  it('renders an available reading with provenance and freshness', () => {
    const availability = available('value', {
      provenance: 'chain',
      asOf: '2026-07-28T08:00:00.000Z',
      stale: false,
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} />)
    expect(container.textContent).toContain('Lecture on-chain')
    expect(container.textContent).toContain('au ')
  })

  it('flags a stale reading as stale', () => {
    const availability = available('value', {
      provenance: 'db',
      asOf: '2026-07-01T08:00:00.000Z',
      stale: true,
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} />)
    expect(container.textContent).toContain('obsolète')
  })

  it('renders unavailable with the service reason in full size', () => {
    const availability = unavailable({
      endpoint: '/api/v1/clients',
      status: 'NOT_EXPOSED',
      reason: 'no_client_directory_endpoint',
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} />)
    expect(container.textContent).toContain('Indisponible')
    expect(container.textContent).toContain('Le service n’expose aucun annuaire client.')
  })

  it('renders compact unavailable with the endpoint when there is one', () => {
    const availability = unavailable({
      endpoint: '/api/v1/clients',
      status: 'NOT_EXPOSED',
      reason: 'no_client_directory_endpoint',
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} compact />)
    expect(container.textContent).toContain('Indisponible')
    expect(container.textContent).toContain('/api/v1/clients')
  })

  it('renders compact unavailable with the reason when there is no endpoint', () => {
    const availability = unavailable({
      status: 'EMPTY',
      reason: 'no_snapshot_timestamp',
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} compact />)
    expect(container.textContent).toContain('Indisponible')
    expect(container.textContent).toContain('L’instantané ne portait aucune date.')
  })

  it('uses a warning tone for stale but not for ordinary unavailable', () => {
    const stale = available('value', { provenance: 'live', asOf: '2026-01-01T00:00:00.000Z', stale: true })
    const { container: staleContainer } = render(<SourceAvailabilityBadge availability={stale} />)
    expect(staleContainer.textContent).toContain('obsolète')

    const absent = unavailable({ reason: 'service_did_not_respond' })
    const { container: absentContainer } = render(<SourceAvailabilityBadge availability={absent} />)
    expect(absentContainer.textContent).toContain('Indisponible')
    expect(absentContainer.textContent).not.toContain('obsolète')
  })

  it('renders a partial status with the service reason', () => {
    const availability = unavailable({
      endpoint: '/api/v1/vault/strategies',
      status: 'PARTIAL',
      reason: 'some_pocket_shares_unreadable',
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} />)
    expect(container.textContent).toContain('Indisponible')
    expect(container.textContent).toContain('Certaines parts de poche n’ont pas pu être lues.')
  })

  it('renders an error status verbatim when the reason is unknown', () => {
    const availability = unavailable({
      endpoint: '/api/v1/vault',
      status: 'ERROR',
      reason: 'custom_failure_code',
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} />)
    expect(container.textContent).toContain('custom_failure_code')
  })

  it('keeps the label readable in compact mode', () => {
    const availability = available('value', {
      provenance: 'manual',
      asOf: '2026-07-28T08:00:00.000Z',
      stale: false,
    })
    const { container } = render(<SourceAvailabilityBadge availability={availability} compact />)
    expect(container.textContent).toContain('Manuel')
  })
})
