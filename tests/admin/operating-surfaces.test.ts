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

  it('Compliance is Som KYC read-only and does not imply Hearst decisions', () => {
    const src = read('src/app/admin/compliance/page.tsx')
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Missing at source/)
    expect(src).not.toMatch(/File journey/)
    expect(src).not.toMatch(/Approve KYC|Reject KYC|Assign analyst/)
    expect(src).toMatch(/Som/)
    expect(src).toMatch(/read only|read-only/i)
    expect(src).toMatch(/does not review|does not decide|Hearst does not/i)
  })

  it('Profile is account session only', () => {
    const src = read('src/app/admin/profile/page.tsx')
    expect(src).not.toMatch(/Coverage path/)
    expect(src).not.toMatch(/Investor file/)
    expect(src).not.toMatch(/For a file to appear/)
    expect(src).toMatch(/Signed in as/)
    expect(src).toMatch(/Session/)
  })

  it('Vaults does not document backend sources or contracts', () => {
    const src = read('src/app/admin/vaults/page.tsx')
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Data contract/)
    expect(src).not.toMatch(/Registry endpoint/)
    expect(src).not.toMatch(/Live sources/)
    expect(src).toMatch(/AUM/)
    expect(src).toMatch(/Rebalance/)
    expect(src).toMatch(/Service/)
    expect(src).toMatch(/DataTableShell/)
    expect(src).not.toMatch(/DataTableShell[\s\S]*\bfit\b/)
    expect(src).toMatch(/lg:block/)
    expect(src).not.toMatch(/Recent activity/)
    expect(src).not.toMatch(/Strategies/)
  })

  it('Vault detail focuses on capital and allocation without source panels', () => {
    const src = read('src/app/admin/vaults/[vaultId]/page.tsx')
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Contract detail/)
    expect(src).not.toMatch(/Deployment registry/)
    expect(src).not.toMatch(/Client anomalies/)
    expect(src).toMatch(/Recent activity/)
    expect(src).toMatch(/Exposure/)
    expect(src).not.toMatch(/rebalancing\/execute/)
    expect(src).not.toMatch(/HearstCriticalAction/)
  })

  it('Service (runtime) remains the technical observability hub', () => {
    const src = read('src/app/admin/runtime/page.tsx')
    expect(src).toMatch(/title="Service"/)
    expect(src).toMatch(/DataCoverageSection/)
    expect(src).toMatch(/System overview|Runtime|Raw responses/)
    expect(src).toMatch(/observability|coverage/i)
  })

  it('Series 1 is an operational explorer without Missing at source walls', () => {
    const src = read('src/app/admin/series-1/page.tsx')
    expect(src).not.toMatch(/Missing at source/)
    expect(src).toMatch(/Series1EventExplorer/)
    expect(src).toMatch(/Operational event explorer/)
  })

  it('Product is business read-only without fake controls', () => {
    const src = read('src/app/admin/product/page.tsx')
    expect(src).not.toMatch(/<form/)
    expect(src).not.toMatch(/Trigger|Execute|Sign transaction/)
    expect(src).toMatch(/Consolidated product view|Production/)
  })

  it('Account nav does not describe an investor file', () => {
    const src = read('src/lib/admin-nav.ts')
    expect(src).not.toMatch(/investor file/i)
    expect(src).toMatch(/Administrator session identity/)
  })
})
