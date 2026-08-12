import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { tableCol } from '@/components/compositions'

/**
 * Table COLUMN CONTRACT (rule 60-design-system).
 *
 * A column expresses its semantic ROLE, not a width. These tests lock the role
 * geometry and the "same role → same Header + Cell classes" invariant, and guard
 * against the debt this contract replaced: a screenshot percentage (`w-[34%]`) or
 * its modern disguise (`flex-[1.7]`, a per-column CSS var).
 */
describe('table column contract', () => {
  it('primary = flexible remainder, jamais une largeur', () => {
    expect(tableCol.primary).toContain('min-w-0')
    // Pas de largeur / pourcentage / flex-basis chiffré sur le primary.
    expect(tableCol.primary).not.toMatch(/w-\[|flex-\[|basis-|\d+%/)
  })

  it('numeric = compact, tabulaire, aligné à droite (Header ET Cell)', () => {
    expect(tableCol.numeric).toContain('tabular-nums')
    expect(tableCol.numeric).toContain('text-right')
    expect(tableCol.numeric).toContain('whitespace-nowrap')
  })

  it('hash = borné + tronqué + monospace', () => {
    expect(tableCol.hash).toContain('min-w-0')
    expect(tableCol.hash).toContain('truncate')
    expect(tableCol.hash).toContain('font-mono')
  })

  it('status / date / action = intrinsèques, sans largeur figée', () => {
    expect(tableCol.status).toBe('whitespace-nowrap')
    expect(tableCol.date).toContain('tabular-nums')
    expect(tableCol.action).toContain('text-right')
  })

  it('aucun rôle n’encode un nombre de capture (%, w-[], flex-[], --col var)', () => {
    for (const [role, classes] of Object.entries(tableCol)) {
      expect(classes, `role ${role}`).not.toMatch(/w-\[|flex-\[|\d+%|--[a-z-]*col/)
    }
  })

  it('les tables admin ne portent plus de largeur en pourcentage', () => {
    const files = [
      'src/components/admin/clients-directory.tsx',
      'src/components/admin/series-1-event-explorer.tsx',
      'src/app/admin/vaults/page.tsx',
      'src/app/admin/vaults/[vaultId]/page.tsx',
      'src/app/admin/operations/page.tsx',
      'src/app/admin/compliance/page.tsx',
      'src/app/admin/product/page.tsx',
      'src/app/admin/keeper/page.tsx',
    ]
    for (const rel of files) {
      const src = readFileSync(join(process.cwd(), rel), 'utf8')
      expect(src, `${rel} w-[%]`).not.toMatch(/w-\[\d+%\]/)
      expect(src, `${rel} fitTableCol legacy`).not.toContain('fitTableCol')
    }
  })

  it('un consommateur applique le MÊME rôle sur Header et Cell', () => {
    // clients-directory : Exposure = numeric des deux côtés (drift Header≠Cell corrigée).
    const src = readFileSync(
      join(process.cwd(), 'src/components/admin/clients-directory.tsx'),
      'utf8',
    )
    expect(src).toContain('<TableHeader className={tableCol.numeric}>Exposure</TableHeader>')
    expect(src).toContain('tableCol.numeric')
    expect(src).toContain('tableCol.status') // KYC badge
    expect(src).toContain('tableCol.primary') // Client
  })
})
