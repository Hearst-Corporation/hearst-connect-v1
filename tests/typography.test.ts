import { adminTypography } from '@/components/admin/typography'
import { describe, expect, it } from 'vitest'

describe('admin typography', () => {
  it('defines a coherent page-title > section-title > surface-title scale', () => {
    expect(adminTypography.pageTitle).toContain('text-2xl/8')
    expect(adminTypography.sectionTitle).toContain('text-lg/7')
    expect(adminTypography.surfaceTitle).toContain('text-sm/6')
    expect(adminTypography.numericHero).toContain('text-4xl/10')
    expect(adminTypography.numericStandard).toContain('text-2xl/8')
  })

  it('keeps the admin console on neutral zinc, including the dark branch', () => {
    // Titles and numeric values: zinc-950 in light, white in dark.
    const emphasis = [
      adminTypography.display,
      adminTypography.pageTitle,
      adminTypography.sectionTitle,
      adminTypography.surfaceTitle,
      adminTypography.numericHero,
      adminTypography.numericStandard,
    ]
    for (const classes of emphasis) {
      expect(classes).toMatch(/(^|\s)text-zinc-950(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-white(\s|$)/)
    }

    // Secondary text: zinc-500 in light, zinc-400 in dark.
    const secondary = [adminTypography.bodyLarge, adminTypography.body, adminTypography.caption, adminTypography.label, adminTypography.mono]
    for (const classes of secondary) {
      expect(classes).toMatch(/(^|\s)text-zinc-500(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-zinc-400(\s|$)/)
    }

    // No brand-* token may reappear in the admin scale.
    for (const classes of Object.values(adminTypography)) {
      expect(classes).not.toMatch(/\bbrand-/)
    }
  })
})
