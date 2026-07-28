import { EndpointSection } from '@/components/admin/endpoint-section'
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

      <AdminSection title="Status Matrix" description="Dependencies and operational probes">
        <AdminStatusMatrix title="Services and Dependencies" rows={matrix} />
      </AdminSection>

      <AdminSection title="Deployment" description="Version and environment — runtime">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Environment" value={r?.environment ?? null} />
          <AdminMetric label="Uptime" value={formatUptime(r?.uptimeSeconds)} />
          <AdminMetric label="Version" value={r?.version ?? null} />
          <AdminMetric label="Commit" value={r?.commitSha ?? null} hint="Deployment SHA" />
          <AdminMetric label="Chain" value={r?.chainId ?? null} hint="chainId" />
          <AdminMetric label="Indexer Interval" value={intervalDetail(scheduler?.intervalMs)} />
        </div>
      </AdminSection>

      <AdminSection title="Raw Responses" description="Full payload for technical verification">
        <EndpointSection endpointId="runtime" title="Runtime" />
        <div className="grid gap-4 lg:grid-cols-2">
          <EndpointSection endpointId="health" title="Health" />
          <EndpointSection endpointId="ready" title="Ready" />
        </div>
      </AdminSection>
    </AdminPage>
  )
}
