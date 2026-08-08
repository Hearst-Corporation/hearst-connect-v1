import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8')
}

describe('admin operating surfaces — diagnostics stay on Service', () => {
  it('Clients does not embed source diagnostics or data contracts', () => {
    const src = read('src/app/admin/clients/page.tsx')
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Missing at source/)
    expect(src).not.toMatch(/Expected source/)
    expect(src).not.toMatch(/Data contract/)
    expect(src).toMatch(/Manage client accounts/)
    expect(src).toMatch(/ClientsDirectory/)
  })

  it('Profile is account session only', () => {
    const src = read('src/app/admin/profile/page.tsx')
    expect(src).not.toMatch(/Coverage path/)
    expect(src).not.toMatch(/Investor file/)
    expect(src).not.toMatch(/For a file to appear/)
    expect(src).toMatch(/Signed in as/)
    expect(src).toMatch(/Session/)
  })
})
