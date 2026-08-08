import { adminTypography } from '@/components/admin/typography'
import { describe, expect, it } from 'vitest'

describe('admin typography', () => {
  // The three heading levels must stay VISIBLY different — an H1 that reads
  // like a card title is the defect this scale was rebuilt to remove.
  it('defines a coherent page-title > section-title > surface-title scale', () => {
    expect(adminTypography.pageTitle).toContain('text-3xl/9')
    expect(adminTypography.pageTitle).toContain('sm:text-4xl/10')
    expect(adminTypography.sectionTitle).toContain('text-xl/7')
    expect(adminTypography.surfaceTitle).toContain('text-base/6')
    expect(adminTypography.numericHero).toContain('text-4xl/10')
    expect(adminTypography.numericStandard).toContain('text-2xl/8')
  })

  it('keeps a full step between each heading level', () => {
    const step = (classes: string): number => {
      const named: Record<string, number> = { base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36 }
      const match = /(?:^|\s)text-([a-z0-9]+)\//.exec(classes)
      return named[match?.[1] ?? ''] ?? 0
    }
    expect(step(adminTypography.pageTitle)).toBeGreaterThan(step(adminTypography.sectionTitle))
    expect(step(adminTypography.sectionTitle)).toBeGreaterThan(step(adminTypography.surfaceTitle))
    // Labels and captions must stay unmistakably below a surface title.
    expect(step(adminTypography.surfaceTitle)).toBeGreaterThan(16 - 1)
    expect(adminTypography.caption).toContain('text-xs/5')
  })

  it('keeps the admin console on Hearst semantic text tokens', () => {
    // Titles and numeric values: ink in light, fg in dark.
    const emphasis = [
      adminTypography.display,
      adminTypography.pageTitle,
      adminTypography.sectionTitle,
      adminTypography.surfaceTitle,
      adminTypography.numericHero,
      adminTypography.numericStandard,
    ]
    for (const classes of emphasis) {
      expect(classes).toMatch(/(^|\s)text-ink(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-fg(\s|$)/)
    }

    // Secondary text: fg-tertiary in light, fg-secondary in dark.
    const secondary = [adminTypography.bodyLarge, adminTypography.body, adminTypography.caption, adminTypography.label, adminTypography.mono]
    for (const classes of secondary) {
      expect(classes).toMatch(/(^|\s)text-fg-tertiary(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-fg-secondary(\s|$)/)
    }

    // No brand-* token may reappear in the admin scale.
    for (const classes of Object.values(adminTypography)) {
      expect(classes).not.toMatch(/\bbrand-/)
    }
  })
})
