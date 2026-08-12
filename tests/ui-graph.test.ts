import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const REPO = resolve(import.meta.dirname, '..')
const GRAPH = join(REPO, 'docs/architecture/ui-graph.json')
const MMD = join(REPO, 'docs/architecture/ui-graph.mmd')
const BUILD = join(REPO, 'scripts/build-ui-graph.mjs')

const NODE_TYPES = new Set([
  'ROUTE',
  'PAGE',
  'BUSINESS_REGION',
  'COMPONENT',
  'LAYOUT_PRIMITIVE',
  'SURFACE_PRIMITIVE',
  'DATA_SOURCE',
  'CHART',
  'STATE_BOUNDARY',
  'FOUNDATION',
])

const EDGE_TYPES = new Set([
  'renders',
  'contains',
  'loads',
  'uses_surface',
  'uses_layout',
  'uses_chart',
  'uses_foundation',
  'navigates_to',
  'owns_geometry',
  'owns_data_slot',
])

describe('ui architecture graph', () => {
  it('artifacts exist and schema is valid', () => {
    expect(existsSync(GRAPH)).toBe(true)
    expect(existsSync(MMD)).toBe(true)
    expect(existsSync(BUILD)).toBe(true)

    const graph = JSON.parse(readFileSync(GRAPH, 'utf8')) as {
      schemaVersion: number
      repo: string
      sourceSha: string
      generatedAt: string
      nodes: Array<{ id: string; type: string; source?: string; domain?: string }>
      edges: Array<{ from: string; to: string; type: string }>
    }

    expect(graph.schemaVersion).toBe(1)
    expect(graph.repo).toBe('Hearst-Corporation/hearst-connect-v1')
    expect(graph.sourceSha).toMatch(/^[0-9a-f]{40}$/)
    expect(graph.generatedAt).toBeTruthy()
    expect(graph.nodes.length).toBeGreaterThan(20)
    expect(graph.edges.length).toBeGreaterThan(20)
    expect(graph.nodes.length).toBeLessThan(250)

    const ids = new Set<string>()
    for (const node of graph.nodes) {
      expect(ids.has(node.id)).toBe(false)
      ids.add(node.id)
      expect(NODE_TYPES.has(node.type)).toBe(true)
      if (node.source) {
        expect(existsSync(join(REPO, node.source))).toBe(true)
      }
    }

    for (const edge of graph.edges) {
      expect(EDGE_TYPES.has(edge.type)).toBe(true)
      expect(ids.has(edge.from)).toBe(true)
      expect(ids.has(edge.to)).toBe(true)
    }

    // Stable ASCII sort contract (same comparator as the generator)
    const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
    const nodeIds = graph.nodes.map((n) => n.id)
    expect(nodeIds).toEqual([...nodeIds].sort(cmp))
    const edgeKeys = graph.edges.map((e) => `${e.from}\0${e.type}\0${e.to}`)
    expect(edgeKeys).toEqual([...edgeKeys].sort(cmp))
  })

  it('covers account, admin, shared foundations, distinct surface trees', () => {
    const graph = JSON.parse(readFileSync(GRAPH, 'utf8')) as {
      nodes: Array<{ id: string; type: string; domain?: string; surface?: { kind: string } | null }>
      edges: Array<{ from: string; to: string; type: string }>
    }
    const ids = new Set(graph.nodes.map((n) => n.id))

    expect(ids.has('route:account')).toBe(true)
    expect(ids.has('page:account-dashboard')).toBe(true)
    expect(ids.has('region:account-movements')).toBe(true)
    expect(ids.has('component:movement-timeline')).toBe(true)
    expect(ids.has('surface:account-shell')).toBe(true)

    expect(ids.has('route:admin')).toBe(true)
    expect(ids.has('route:admin-vaults')).toBe(true)
    expect(ids.has('route:admin-clients')).toBe(true)
    expect(ids.has('route:admin-compliance')).toBe(true)
    expect(ids.has('route:admin-operations')).toBe(true)
    expect(ids.has('route:admin-runtime')).toBe(true)
    expect(ids.has('route:admin-api-explorer')).toBe(true)
    expect(ids.has('page:admin-dashboard')).toBe(true)
    expect(ids.has('surface:admin-box')).toBe(true)
    expect(ids.has('surface:admin-dash-card')).toBe(true)

    expect(ids.has('foundation:color')).toBe(true)
    expect(ids.has('foundation:console-surface')).toBe(true)
    expect(ids.has('foundation:charts')).toBe(true)

    const accountSurface = graph.nodes.find((n) => n.id === 'surface:account-shell')
    const adminSurface = graph.nodes.find((n) => n.id === 'surface:admin-box')
    expect(accountSurface?.surface?.kind).toBe('account:user-shell')
    expect(adminSurface?.surface?.kind).toBe('admin:surfaceBox')
    expect(accountSurface?.surface?.kind).not.toBe(adminSurface?.surface?.kind)

    const foundationEdges = graph.edges.filter(
      (e) => e.type === 'uses_foundation' && e.to.startsWith('foundation:'),
    )
    const fromAccount = foundationEdges.some((e) => e.from.startsWith('component:user-dashboard') || e.from.startsWith('surface:account'))
    const fromAdmin = foundationEdges.some((e) => e.from.startsWith('surface:admin') || e.from.startsWith('page:admin'))
    expect(fromAccount).toBe(true)
    expect(fromAdmin).toBe(true)
  })

  it('Mermaid is regenerable from the builder', () => {
    const before = readFileSync(MMD, 'utf8')
    execFileSync('node', [BUILD], { cwd: REPO, encoding: 'utf8' })
    const after = readFileSync(MMD, 'utf8')
    expect(after.startsWith('%% Generated by scripts/build-ui-graph.mjs')).toBe(true)
    expect(after).toContain('flowchart TB')
    expect(after).toContain('route_account')
    expect(after).toContain('shared_foundations')
    // Rebuild is stable aside from generatedAt inside JSON; Mermaid uses sourceSha
    expect(after.split('\n').filter((l) => !l.startsWith('%% sourceSha'))).toEqual(
      before.split('\n').filter((l) => !l.startsWith('%% sourceSha')),
    )
  })

  it('graph:check reports a known status', () => {
    const out = execFileSync('node', [BUILD, '--check'], { cwd: REPO, encoding: 'utf8' })
    expect(out).toMatch(/GRAPH_(CURRENT|STALE|INVALID)/)
  })
})
