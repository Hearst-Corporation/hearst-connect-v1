import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ERROR_PATH = resolve(import.meta.dirname, '../../src/app/admin/error.tsx')
const LAYOUT_PATH = resolve(import.meta.dirname, '../../src/app/admin/layout.tsx')

describe('/admin — error boundary (ERROR-STATE-INTEGRATION-010)', () => {
  const source = readFileSync(ERROR_PATH, 'utf8')
  const layout = readFileSync(LAYOUT_PATH, 'utf8')

  it('error.tsx exists', () => {
    expect(existsSync(ERROR_PATH)).toBe(true)
  })

  it('uses integrated admin copy and retry', () => {
    expect(source).toContain('Unable to load this page')
    expect(source).toContain('Try again')
    expect(source).toMatch(/onClick=\{reset\}/)
    expect(source).toContain('System status')
  })

  it('renders digest only when available', () => {
    expect(source).toMatch(/\{error\.digest \?/)
    expect(source).toContain('Reference ·')
  })

  it('does not use the old standalone surface treatment', () => {
    expect(source).not.toContain('Surface unavailable')
    expect(source).not.toContain('This surface could not be rendered')
    expect(source).not.toContain("minHeight: '100dvh'")
    expect(source).not.toMatch(/placeItems:\s*['"]center['"]/)
    expect(source).not.toMatch(/background:\s*['"]var\(--color-console-app/)
  })

  it('does not recreate the admin shell or sidebar', () => {
    expect(source).not.toMatch(/from ['"]@\/components\/admin\/application-layout['"]/)
    expect(source).not.toMatch(/<AdminApplicationLayout/)
    expect(source).not.toMatch(/<Sidebar/)
    expect(source).not.toMatch(/SidebarLayout/)
    expect(layout).toContain('AdminApplicationLayout')
  })

  it('does not import or call the backend', () => {
    expect(source).not.toMatch(/from ['"]@\/lib\/backend/)
    expect(source).not.toMatch(/callBackend|loadAdminDashboard|fetch\(/)
  })

  it('uses design-system surface tokens', () => {
    expect(source).toMatch(/from ['"]@\/components\/admin\/surface['"]/)
    expect(source).toContain('surfaceBox')
    expect(source).toContain('surfaceInset')
  })
})
