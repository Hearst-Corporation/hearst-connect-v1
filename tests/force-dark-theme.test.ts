import { THEME_INIT_SCRIPT } from '@/lib/theme'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('thème sombre forcé', () => {
  it('le script d’init impose dark et purge light', () => {
    expect(THEME_INIT_SCRIPT).toContain("classList.add('dark')")
    expect(THEME_INIT_SCRIPT).toContain("classList.remove('light')")
    expect(THEME_INIT_SCRIPT).toContain("setItem('theme','dark')")
  })

  it('le layout racine pose class dark sur <html>', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8')
    expect(layout).toMatch(/className=\{`dark /)
    expect(layout).not.toContain('ThemeToggle')
  })

  it('aucune bascule de thème dans le produit', () => {
    const header = readFileSync(join(process.cwd(), 'src/components/marketing/site-header.tsx'), 'utf8')
    const auth = readFileSync(join(process.cwd(), 'src/app/(auth)/layout.tsx'), 'utf8')
    expect(header).not.toContain('ThemeToggle')
    expect(auth).not.toContain('ThemeToggle')
  })
})
