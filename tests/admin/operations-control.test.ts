import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('admin operations control surface', () => {
  it('does not embed Service diagnostics', () => {
    const src = read('src/app/admin/operations/page.tsx')
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Missing at source/)
    expect(src).not.toMatch(/Expected source/)
    expect(src).not.toMatch(/Data contract/)
    expect(src).toMatch(/Monitor portfolio drift/)
    expect(src).toMatch(/OperationsIndexerCard/)
    expect(src).toMatch(/Recent operations/)
  })

  it('does not expose an unsafe one-click Rebalance execute control', () => {
    const src = read('src/app/admin/operations/page.tsx')
    expect(src).not.toMatch(/Sign transaction/)
    expect(src).not.toMatch(/Execute on-chain/)
    expect(src).not.toMatch(/action=\{[^}]*[Rr]ebalanc/)
    expect(src).not.toMatch(/>\s*Rebalance\s*</)
    expect(src).toMatch(/not exposed as a safe admin action/)
  })

  it('surfaces the verified indexer action only', () => {
    const card = read('src/components/admin/operations-indexer-card.tsx')
    expect(card).toMatch(/Run indexer/)
    expect(card).toMatch(/admin\/indexer\/trigger/)
    expect(card).toMatch(/does not sign/)
  })
})
