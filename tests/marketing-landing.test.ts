import {
  doctrinePillars,
  domainBadges,
  platformCapabilities,
  primaryFeatures,
} from '@/components/marketing/landing-content'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const landingSource = readFileSync(join(ROOT, 'src/components/marketing/landing-page.tsx'), 'utf8')
const closingSource = readFileSync(join(ROOT, 'src/components/marketing/closing-cta.tsx'), 'utf8')
const marketingSource = `${landingSource}\n${closingSource}`

describe('marketing landing', () => {
  it('exposes one console preview in the hero only', () => {
    const previewCount = (landingSource.match(/<ConsolePreviewShot/g) ?? []).length
    expect(previewCount).toBe(1)
  })

  it('renders every public section anchor', () => {
    for (const id of [
      'domains-heading',
      'features-heading',
      'platform-heading',
      'doctrine-heading',
      'cta-heading',
    ]) {
      expect(marketingSource).toContain(`id="${id}"`)
    }
  })

  it('keeps content modules free of duplicated doctrine copy', () => {
    const primaryText = primaryFeatures.map((f) => f.description).join(' ')
    const platformText = platformCapabilities.map((f) => f.description).join(' ')
    for (const pillar of doctrinePillars) {
      expect(primaryText).not.toContain(pillar.desc)
      expect(platformText).not.toContain(pillar.desc)
    }
  })

  it('lists workspace domains once', () => {
    expect(domainBadges).toHaveLength(5)
    expect(new Set(domainBadges).size).toBe(domainBadges.length)
  })
})
