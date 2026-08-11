import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/font/local', () => ({
  default: vi.fn(() => ({
    variable: '--font-satoshi',
    className: 'font-satoshi',
  })),
}))

describe('polices — Satoshi Variable uniquement', () => {
  it('expose Satoshi via variable + className', async () => {
    const { fontSatoshi } = await import('@/lib/fonts')
    expect(fontSatoshi.variable).toBe('--font-satoshi')
    expect(fontSatoshi.className).toBe('font-satoshi')
  })

  it('fichier Satoshi Variable vendu localement', () => {
    const path = join(process.cwd(), 'src/assets/fonts/Satoshi-Variable.woff2')
    expect(existsSync(path)).toBe(true)
  })

  it('le layout racine applique Satoshi Variable', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
    expect(layout).toContain('fontSatoshi.variable')
    expect(layout).toContain('fontSatoshi.className')
    expect(layout).toContain('font-sans')
  })

  it('font-sans / display / mono pointent tous vers Satoshi', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--font-sans:\s*var\(--font-satoshi\)/)
    expect(css).toMatch(/--font-display:\s*var\(--font-satoshi\)/)
    expect(css).toMatch(/--font-mono:\s*var\(--font-satoshi\)/)
  })

  it('account command center inherits Satoshi — never alien UI font stacks', () => {
    const css = readFileSync(
      join(process.cwd(), 'src/features/user-dashboard/user-dashboard.css'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\//g, ' ')
    const tsx = readFileSync(
      join(process.cwd(), 'src/features/user-dashboard/user-dashboard.tsx'),
      'utf8',
    )
    expect(css).toMatch(/font-family:\s*var\(--font-satoshi\)/)
    expect(css).not.toMatch(/\bInter\b/)
    expect(css).not.toMatch(/JetBrains Mono|SF Mono|Menlo|Consolas/)
    expect(tsx).toMatch(/AdminHeroTitle/)
    expect(tsx).toMatch(/Command center/)
  })
})

describe('Hearst semantic text tokens', () => {
  it('declares fg / fg-secondary / fg-tertiary / ink in @theme', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    expect(css).toMatch(/--color-fg:\s*#f3f5f2;/)
    expect(css).toMatch(/--color-fg-secondary:\s*#a8aea9;/)
    expect(css).toMatch(/--color-fg-tertiary:\s*#737a75;/)
    expect(css).toMatch(/--color-ink:\s*#0b0f10;/)
  })

  it('le thème forcé reste dark', () => {
    expect(THEME_INIT_SCRIPT).toContain("classList.add('dark')")
  })
})
