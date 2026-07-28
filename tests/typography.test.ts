import { adminTypography } from '@/components/admin/typography'
import { describe, expect, it } from 'vitest'

describe('admin typography', () => {
  it('définit une échelle H1 > H2 > H3 cohérente', () => {
    expect(adminTypography.h1).toContain('text-2xl/8')
    expect(adminTypography.h2).toContain('font-semibold')
    expect(adminTypography.h3).toContain('text-sm/6')
    expect(adminTypography.kpiHero).toContain('text-4xl/10')
    expect(adminTypography.kpiValue).toContain('text-2xl/8')
  })

  it('tient la console admin sur le neutre zinc, branche sombre comprise', () => {
    // Titres et valeurs KPI : zinc-950 en clair, blanc en sombre.
    const emphase = [
      adminTypography.h1,
      adminTypography.h2,
      adminTypography.h3,
      adminTypography.kpiHero,
      adminTypography.kpiValue,
      adminTypography.navLabel,
    ]
    for (const classes of emphase) {
      expect(classes).toMatch(/(^|\s)text-zinc-950(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-white(\s|$)/)
    }

    // Texte secondaire : zinc-500 en clair, zinc-400 en sombre.
    const secondaire = [
      adminTypography.body,
      adminTypography.caption,
      adminTypography.label,
      adminTypography.endpoint,
      adminTypography.navHint,
    ]
    for (const classes of secondaire) {
      expect(classes).toMatch(/(^|\s)text-zinc-500(\s|$)/)
      expect(classes).toMatch(/(^|\s)dark:text-zinc-400(\s|$)/)
    }

    // Aucun token brand-* ne doit réapparaître dans l'échelle admin.
    for (const classes of Object.values(adminTypography)) {
      expect(classes).not.toMatch(/\bbrand-/)
    }
  })
})
