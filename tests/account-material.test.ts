import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Cross-surface MATERIAL ROLE alignment (rule 60-design-system).
 *
 * The account surface shares the Hearst GLASS material with the admin boxes:
 * the same mint glow behind translucent `console-card` faces + backdrop blur.
 * It does NOT adopt admin COMPONENTS (no Panel/Bento) — only the material.
 */
describe('account material role alignment', () => {
  const tsx = readFileSync(
    join(process.cwd(), 'src/features/user-dashboard/user-dashboard.tsx'),
    'utf8',
  )
  const css = readFileSync(
    join(process.cwd(), 'src/features/user-dashboard/user-dashboard.css'),
    'utf8',
  )

  /** Body of the first CSS rule whose selector exactly matches `selector`. */
  function ruleBody(selector: string): string {
    const lines = css.split('\n')
    const start = lines.findIndex((l) => l.trim() === `${selector} {`)
    if (start === -1) return ''
    const rest = lines.slice(start + 1)
    const end = rest.findIndex((l) => l.trim() === '}')
    return rest.slice(0, end === -1 ? undefined : end).join('\n')
  }

  it('mounts the shared Hearst glow behind the account shell', () => {
    // Same asset/primitive as admin — not a local reinvented gradient.
    expect(tsx).toContain('consoleGlowLayer')
    expect(tsx).toContain('CONSOLE_GLOW_SRC')
    // The root background is the flat app token now (the glow is a separate
    // fixed layer); the old local mint gradient background is gone.
    const root = ruleBody('.ud-root')
    expect(root).toContain('background: var(--color-console-app)')
    expect(root).not.toContain('radial-gradient(')
  })

  it('shell + center panel use the translucent glass face (console-card), not opaque graphite', () => {
    const shell = ruleBody('.ud-root .shell')
    const center = ruleBody('.ud-root .center-panel')
    expect(shell).toContain('background: var(--color-console-card)')
    expect(center).toContain('background: var(--color-console-card)')
    // The opaque application surface is no longer the shell material.
    expect(shell).not.toContain('var(--color-console-surface)')
  })

  it('applies the glass blur via Tailwind utilities (pipeline drops raw backdrop-filter here)', () => {
    // Blur travels on the element, same mechanism as admin surfaceBox.
    expect(tsx).toMatch(/className="shell backdrop-blur-xl backdrop-saturate-150"/)
    expect(tsx).toMatch(/center-panel backdrop-blur-xl backdrop-saturate-150/)
  })

  it('does NOT convert account primitives to admin components', () => {
    // Material shared, component tree NOT shared (rule 60 cross-surface).
    expect(tsx).not.toMatch(/from '@\/components\/compositions\/panel'/)
    expect(tsx).not.toMatch(/\b(BentoGrid|BentoCard|DashCard)\b/)
    // Account keeps its own semantic shell class.
    expect(tsx).toContain('className="shell')
  })
})
