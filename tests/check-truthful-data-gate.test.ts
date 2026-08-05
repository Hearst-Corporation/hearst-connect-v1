import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('check:truthful-data gate', () => {
  it('passe sur le runtime actuel', () => {
    const result = spawnSync('node', ['scripts/check-truthful-data.mjs'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    expect(result.status, result.stdout + result.stderr).toBe(0)
  })
})
