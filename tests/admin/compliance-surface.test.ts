import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const COMPLIANCE_PAGE = join(ROOT, 'src/app/admin/compliance/page.tsx')

function readCompliancePage(): string {
  return readFileSync(COMPLIANCE_PAGE, 'utf8')
}

describe('admin compliance surface — Som KYC read-only', () => {
  it('does not embed technical source diagnostics', () => {
    const src = readCompliancePage()
    expect(src).not.toMatch(/Source activity/)
    expect(src).not.toMatch(/Missing at source/)
    expect(src).not.toMatch(/expectedSource/)
    expect(src).not.toMatch(/etatSourceLisible/)
    expect(src).not.toMatch(/registry\.sources/)
    expect(src).not.toMatch(/ChartFrame/)
    expect(src).not.toMatch(/DATA_COVERAGE_ENTRY/)
  })

  it('does not imply Hearst KYC decisions or review workflows', () => {
    const src = readCompliancePage()
    expect(src).not.toMatch(/Review queue/)
    expect(src).not.toMatch(/File journey/)
    expect(src).not.toMatch(/Approve KYC|Reject KYC|Assign analyst/)
    expect(src).not.toMatch(/Decision rendered/)
    expect(src).toMatch(/Som/)
    expect(src).toMatch(/read only|read-only/i)
    expect(src).toMatch(/does not review|does not decide|Hearst does not/i)
  })

  it('surfaces Som KYC status in a read-only table', () => {
    const src = readCompliancePage()
    expect(src).toMatch(/Som KYC status/)
    expect(src).toMatch(/kycStatusLabel/)
    expect(src).toMatch(/kycStepLabel/)
    expect(src).not.toMatch(/<Button/)
  })
})
