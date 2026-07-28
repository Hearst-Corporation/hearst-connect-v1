import { EndpointSection } from '@/components/admin/endpoint-section'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { PageHeader } from '@/components/admin/page-header'
import {
  AdminMetric,
  AdminSection,
  AdminStatusMatrix,
  type StatusMatrixRow,
} from '@/components/admin/surfaces'
import { AdminPage } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Service Status' }
export const dynamic = 'force-dynamic'

type Runtime = {
  readonly databaseStatus?: string
  readonly contractStatus?: string
  readonly indexerStatus?: string
  readonly environment?: string
  readonly uptimeSeconds?: number
  readonly version?: string
  readonly commitSha?: string
  readonly chainId?: number
  readonly db?: { readonly reachable?: boolean; readonly latencyMs?: number | null }
  readonly indexerScheduler?: {
    readonly status?: string
    readonly intervalMs?: number | null
    readonly lastSuccessAt?: string | null
    readonly consecutiveErrors?: number
    readonly lastIndexedBlock?: number | null
  }
}

function formatUptime(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—'
  if (seconds < 120) return `${Math.round(seconds)} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 120) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}

function statusTone(raw: string | undefined): StatusMatrixRow['ton'] {
  if (raw === 'ready' || raw === 'CONFIGURED' || raw === 'RUNNING' || raw === 'running') return 'sain'
  if (raw === 'NOT_CONFIGURED' || raw === 'disabled') return 'attention'
  if (raw === 'unreachable') return 'critique'
  return 'neutre'
}

function statusFromRaw(raw: string | undefined): 'LIVE' | 'PARTIAL' | 'UNAVAILABLE' {
  if (raw === 'ready' || raw === 'CONFIGURED' || raw === 'RUNNING' || raw === 'running') return 'LIVE'
  if (raw === undefined) return 'UNAVAILABLE'
  return 'PARTIAL'
}

function statusLabel(raw: string | undefined): string {
  switch (raw) {
    case 'ready':
      return 'Reachable'
    case 'CONFIGURED':
      return 'Configured'
    case 'RUNNING':
      return 'Running'
    case 'running':
      return 'Active'
    case 'NOT_CONFIGURED':
      return 'Not configured'
    case 'unreachable':
      return 'Unreachable'
    case 'disabled':
      return 'Disabled'
    default:
      return raw ?? 'Not reported'
  }
}

function latencyDetail(ms: number | null | undefined): string | undefined {
  if (ms === null || ms === undefined) return undefined
  return `${ms} ms`
}

function blockDetail(block: number | null | undefined): string | undefined {
  if (block === null || block === undefined) return undefined
  return `block ${formatNumber(block)}`
}

function errorsDetail(n: number | undefined): string {
  if (n !== undefined && n > 0) return `${n} error(s)`
  return 'no errors'
}

function intervalDetail(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined) return null
  return `${ms} ms`
}

function buildMatrix(input: {
  healthOk: boolean
  readyOk: boolean
  readyDb: string | undefined
  runtime: Runtime | null
}): StatusMatrixRow[] {
  const { healthOk, readyOk, readyDb, runtime: r } = input
  const scheduler = r?.indexerScheduler
  const readyLive = readyOk

  return [
    {
      id: 'health',
      label: 'Liveness (health)',
      status: healthOk ? 'LIVE' : 'UNAVAILABLE',
      detail: healthOk ? 'HTTP 200' : 'No response',
      ton: healthOk ? 'sain' : 'critique',
    },
    {
      id: 'ready',
      label: 'Readiness (ready)',
      status: readyLive ? 'LIVE' : 'UNAVAILABLE',
      detail: readyOk ? readyDb : undefined,
      ton: readyLive ? 'sain' : 'critique',
    },
    {
      id: 'db',
      label: 'Database',
      status: statusFromRaw(r?.databaseStatus),
      detail: latencyDetail(r?.db?.latencyMs),
      ton: statusTone(r?.databaseStatus),
    },
    {
      id: 'contract',
      label: 'Contract',
      status: statusFromRaw(r?.contractStatus),
      detail: statusLabel(r?.contractStatus),
      ton: statusTone(r?.contractStatus),
    },
    {
      id: 'indexer',
      label: 'Indexer',
      status: statusFromRaw(r?.indexerStatus),
      detail: blockDetail(scheduler?.lastIndexedBlock),
      ton: statusTone(r?.indexerStatus),
    },
    {
      id: 'scheduler',
      label: 'Scheduler',
      status: statusFromRaw(scheduler?.status),
      detail: errorsDetail(scheduler?.consecutiveErrors),
      ton: statusTone(scheduler?.status),
    },
  ]
}

export default async function RuntimePage() {
  const [runtime, health, ready] = await Promise.all([
    callBackend<Runtime>('runtime'),
    callBackend<Record<string, unknown>>('health'),
    callBackend<{ ready?: boolean; db?: string }>('ready'),
  ])

  const r = runtime.ok ? runtime.data : null
  const scheduler = r?.indexerScheduler
  const readyOk = ready.ok && ready.data.ready === true

  const matrix = buildMatrix({
    healthOk: health.ok,
    readyOk,
    readyDb: ready.ok ? ready.data.db : undefined,
    runtime: r,
  })

  return (
    <AdminPage>
      <PageHeader
        title="Runtime & Infrastructure"
        description="Status matrix, deployment metrics, and raw probe responses."
      />

      {/*
        The matrix is a single full-width list card and is therefore the section's
        direct child: wrapping one surface in a one-column grid would be an empty
        container around another surface. Its own card title is gone too — the
        section's H2 already names it, and an H3 repeating it inside the card was
        a second header for one piece of content.
      */}
      <AdminSection title="Status Matrix" description="Dependencies and operational probes">
        <AdminStatusMatrix rows={matrix} />
      </AdminSection>

      {/*
        Deployment facts: six peers, no headline among them, so they compose as a
        balanced 3 × 2 block rather than the old `sm:grid-cols-2 lg:grid-cols-4`,
        which put four on the first row and marooned two on the left of an empty
        one.

        `AdminMetricGrid count={6}` would give `lg:grid-cols-6`; at 1440 that is
        roughly 165px per tile, too thin for a commit SHA or an environment name
        at the standard numeric size. Explicit spans on the 12-column grid give a
        full last row at every breakpoint: 3 across at lg (span 4), 2 at md
        (md 4 of 8), 1 at base — 6, 6 and 6 tiles with nothing stranded.

        Order is by meaning, one row per idea: deployment identity, then running
        state. Every tile carries exactly one caption — the runtime field it
        reads — so the tiles in a row are the same height and the caption doubles
        as provenance on a page whose job is technical verification.
      */}
      <AdminSection
        title="Deployment"
        description="Version, environment, and scheduler settings as reported by the runtime probe"
      >
        <AdminGrid>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Environment" value={r?.environment ?? null} hint="environment" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Version" value={r?.version ?? null} hint="version" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Commit" value={r?.commitSha ?? null} hint="commitSha" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Uptime" value={formatUptime(r?.uptimeSeconds)} hint="uptimeSeconds" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Chain" value={r?.chainId ?? null} hint="chainId" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric
              label="Indexer Interval"
              value={intervalDetail(scheduler?.intervalMs)}
              hint="indexerScheduler.intervalMs"
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>

      {/*
        Raw payloads. The runtime probe carries the whole deployment picture and
        takes the full 12 columns; health and ready are one-line orchestrator
        answers and pair off at 6 each, so the row closes exactly. Declared spans
        rather than a bare `lg:grid-cols-2`, which left the runtime block and the
        pair on two unrelated grids.
      */}
      <AdminSection title="Raw Responses" description="Full payload for technical verification">
        <AdminGrid>
          <AdminCol span={12}>
            <EndpointSection endpointId="runtime" title="Runtime" />
          </AdminCol>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="health" title="Health" />
          </AdminCol>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="ready" title="Ready" />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
    </AdminPage>
  )
}
