import { explorerAddressUrl, explorerTxUrl } from '@/lib/explorer'
import { describe, expect, it } from 'vitest'

describe('explorer URLs', () => {
  it('génère un lien Base mainnet', () => {
    expect(explorerTxUrl(8453, '0xabc123')).toBe('https://basescan.org/tx/0xabc123')
    expect(explorerAddressUrl(8453, '0xdead')).toBe('https://basescan.org/address/0xdead')
  })

  it('génère un lien Base Sepolia', () => {
    expect(explorerTxUrl(84532, '0xabc')).toBe('https://sepolia.basescan.org/tx/0xabc')
  })

  it('refuse hash ou adresse absents', () => {
    expect(explorerTxUrl(8453, undefined)).toBeNull()
    expect(explorerAddressUrl(8453, '')).toBeNull()
  })

  it('refuse chaîne non reconnue', () => {
    expect(explorerTxUrl(1, '0xabc')).toBeNull()
  })
})
