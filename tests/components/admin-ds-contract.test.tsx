import {
  AdminToneBadge,
  toneForActivityStatus,
  toneForBackendState,
  toneForKycStatus,
} from '@/components/admin/status-tone'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

describe('Admin status tone contract', () => {
  it('maps indexed / confirmed to accent (ordinary healthy), not success green', () => {
    expect(toneForActivityStatus('indexed')).toBe('accent')
    expect(toneForActivityStatus('CONFIRMED')).toBe('accent')
    expect(toneForActivityStatus('FAILED')).toBe('bad')
    expect(toneForActivityStatus('PENDING')).toBe('warn')
  })

  it('maps KYC approved to ok and high-risk to bad', () => {
    expect(toneForKycStatus('APPROVED')).toBe('ok')
    expect(toneForKycStatus('HIGH_RISK')).toBe('bad')
    expect(toneForKycStatus('IN_REVIEW')).toBe('warn')
  })

  it('maps backend Live to ok', () => {
    expect(toneForBackendState('LIVE')).toBe('ok')
    expect(toneForBackendState('ISSUE')).toBe('warn')
    expect(toneForBackendState('OFFLINE')).toBe('neutral')
  })

  it('renders semantic token classes without lime/green/amber utilities', () => {
    render(<AdminToneBadge tone="accent">indexed</AdminToneBadge>)
    const el = screen.getByText('indexed')
    const cls = el.className
    expect(cls).toMatch(/accent-/)
    expect(cls).not.toMatch(/lime-|green-|amber-|rose-|red-\d/)
  })
})

describe('check-admin-ds-contract gate', () => {
  it('selftest passes', () => {
    const script = resolve(process.cwd(), 'scripts/check-admin-ds-contract.mjs')
    execFileSync(process.execPath, [script, '--selftest'], { stdio: 'pipe' })
  })
})
