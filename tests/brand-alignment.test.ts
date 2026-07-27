import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(ROOT, 'src/styles/tailwind.css'), 'utf8')
const shell = readFileSync(resolve(ROOT, 'src/app/admin/admin-shell.tsx'), 'utf8')

describe('alignement de marque du dashboard', () => {
  it('utilise les valeurs officielles observées sans réintroduire l’ancien or', () => {
    expect(css).toContain('--color-accent-400: #a7fb90')
    expect(css).toContain('--color-surface-page: #fcfdfc')
    expect(css).not.toMatch(/#c6a94e|OR HEARST|cockpit-/i)
  })

  it('conserve exactement les cinq destinations principales', () => {
    const destinations = ['/admin', '/admin/clients', '/admin/conformite', '/admin/operations', '/admin/administration']
    for (const destination of destinations) expect(shell).toContain(`href: '${destination}'`)
    expect(shell.match(/href: '\/admin/g)).toHaveLength(5)
  })

  it('n’importe pas la fonte trial du site officiel', () => {
    expect(css).not.toMatch(/Fkgrotesktrial/i)
    expect(css).toContain('--font-sans: Arial')
  })
})
