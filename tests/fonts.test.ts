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
})

describe('texte blanc deep sous .dark', () => {
  it('la rampe zinc dark pose du blanc deep sur 300/400/500', () => {
    const css = readFileSync(join(process.cwd(), 'src/styles/tailwind.css'), 'utf8')
    const dark = css.slice(css.indexOf('.dark {'))
    expect(dark).toMatch(/--color-zinc-300:\s*#ffffff;/)
    expect(dark).toMatch(/--color-zinc-400:\s*#f2f2f2;/)
    expect(dark).toMatch(/--color-zinc-500:\s*#e0e0e0;/)
  })

  it('le thème forcé reste dark', () => {
    expect(THEME_INIT_SCRIPT).toContain("classList.add('dark')")
  })
})
