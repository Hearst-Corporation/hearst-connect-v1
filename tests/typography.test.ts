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

  it('utilise les tokens brand pour le texte', () => {
    expect(adminTypography.h1).toContain('text-brand-foreground')
    expect(adminTypography.body).toContain('text-brand-muted')
    expect(adminTypography.caption).toContain('text-brand-muted')
  })
})
