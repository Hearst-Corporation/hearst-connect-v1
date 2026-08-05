import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/local', () => ({
  default: vi.fn(() => ({
    variable: '--font-satoshi',
    className: 'font-satoshi',
  })),
}))

describe('polices — Satoshi Variable uniquement', () => {
  it('expose une seule famille via fontSatoshi', async () => {
    const { fontSatoshi } = await import('@/lib/fonts')
    expect(fontSatoshi.variable).toBe('--font-satoshi')
  })

  it('fichier Satoshi Variable vendu localement', () => {
    const path = join(process.cwd(), 'src/assets/fonts/Satoshi-Variable.woff2')
    expect(existsSync(path)).toBe(true)
  })
})
