import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { surfaceInset } from '@/components/admin/surface'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, DataTableShell, SectionCard, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import {
  runtimeMatrixStatus,
  runtimeStatusLabel,
  type RuntimePayload,
} from '@/lib/backend/runtime'
import { formatDateTime, formatNumber } from '@/lib/format'
import { readableSourceState, readableSourceStateCap } from '@/lib/movements'
import { editorial } from '@/lib/vaults/model'
import { DataCoverageSection } from '@/features/admin-runtime/data-coverage-section'
import {
  CheckCircleIcon,
  CpuChipIcon,
  HeartIcon,
  TagIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { IndexerTriggerForm } from './indexer-trigger-form'

export const metadata: Metadata = { title: 'Service' }
export const dynamic = 'force-dynamic'

/**
 * Service — single technical observability surface (runtime, coverage, probes).
 * Business pages must not duplicate these diagnostics.
 */

type MatrixRow = {
  readonly id: string
  readonly label: string
  readonly status: 'LIVE' | 'PARTIAL' | 'UNAVAILABLE'
  readonly detail: string
}

function formatUptime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—'
  if (seconds < 120) return `${Math.round(seconds)} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 120) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}

function latencyDetail(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  return `${ms} ms`
}

function blockDetail(block: number | string | null | undefined): string {
  if (block === null || block === undefined) return '—'
  const numeric = typeof block === 'string' ? Number(block) : block
  if (!Number.isFinite(numeric)) return '—'
  return `block ${formatNumber(numeric)}`
}

function errorsDetail(n: number | null | undefined): string {
  // A missing measurement is NOT "no errors": this label is reserved
  // for a genuinely measured zero (n === 0). Without a measurement, the gap stays named.
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (n > 0) return `${formatNumber(n)} error(s)`
  return 'no errors'
}

function intervalDetail(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  return `${ms} ms`
}

function buildMatrix(input: {
  healthOk: boolean
  readyOk: boolean
  readyDb: string | undefined
  runtime: RuntimePayload | null
}): readonly MatrixRow[] {
  const { healthOk, readyOk, readyDb, runtime: r } = input
  const scheduler = r?.indexerScheduler

  return [
    {
      id: 'health',
      label: 'Liveness (health)',
      status: healthOk ? 'LIVE' : 'UNAVAILABLE',
      detail: healthOk ? 'HTTP 200' : 'No response',
    },
    {
      id: 'ready',
      label: 'Readiness (ready)',
      status: readyOk ? 'LIVE' : 'UNAVAILABLE',
      detail: readyOk ? (readyDb ?? '—') : 'Not ready',
    },
    {
      id: 'db',
      label: 'Database',
      status: runtimeMatrixStatus(r?.databaseStatus ?? undefined),
      detail: latencyDetail(r?.db?.latencyMs),
    },
    {
      id: 'contract',
      label: 'Vault contract',
      status: runtimeMatrixStatus(r?.contractStatus ?? undefined),
      detail: runtimeStatusLabel(r?.contractStatus),
    },
    {
      id: 'indexer',
      label: 'Indexer',
      status: runtimeMatrixStatus(r?.indexerStatus ?? undefined),
      detail: blockDetail(scheduler?.lastIndexedBlock),
    },
    {
      id: 'scheduler',
      label: 'Scheduler',
      status: runtimeMatrixStatus(scheduler?.status ?? undefined),
      detail: errorsDetail(scheduler?.consecutiveErrors),
    },
  ]
}

function formatCodePresent(codePresent: boolean | null | undefined): string {
  if (codePresent === undefined || codePresent === null) return '—'
  return codePresent ? 'Yes' : 'No'
}

function jsonLisible(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return '—'
  }
}

export default async function RuntimePage() {
  const session = await requireSession()
  const [runtime, health, ready] = await Promise.all([
    callBackend<RuntimePayload>('runtime'),
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

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'health',
      title: 'Health',
      value: editorial(readableSourceStateCap(health.ok ? 'LIVE' : 'UNAVAILABLE')),
      icon: HeartIcon,
    },
    {
      id: 'ready',
      title: 'Ready',
      value: editorial(readableSourceStateCap(readyOk ? 'LIVE' : 'UNAVAILABLE')),
      icon: CheckCircleIcon,
    },
    {
      id: 'indexer',
      title: 'Indexer',
      value: editorial(runtimeStatusLabel(r?.indexerStatus)),
      icon: CpuChipIcon,
    },
    {
      id: 'version',
      title: 'Version',
      value: editorial(r?.serviceVersion ?? 'Not provided'),
      icon: TagIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Service"
        description="Technical observability — dependency health, runtime, data coverage, and endpoint status."
        kpis={kpis}
      />

      <DataTableShell
        title="System overview"
        description="Dependencies and operational probes."
      >
        <TableHead>
          <TableRow>
            <TableHeader className={tableCol.primary}>Component</TableHeader>
            <TableHeader className={tableCol.status}>Status</TableHeader>
            <TableHeader className={tableCol.primary}>Detail</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={tableCol.primary}>
                <div className="truncate font-medium">{row.label}</div>
              </TableCell>
              <TableCell className={tableCol.status}>{readableSourceState(row.status)}</TableCell>
              <TableCell className={tableCol.primary}>{row.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard
        title="Runtime"
        hint="Environment, version, chain, and scheduler as reported by the runtime probe."
      >
      <DescriptionList>
        <DescriptionTerm>Environment</DescriptionTerm>
        <DescriptionDetails>{r?.environment ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Version</DescriptionTerm>
        <DescriptionDetails>{r?.serviceVersion ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Commit</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.commitSha ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Uptime</DescriptionTerm>
        <DescriptionDetails>{formatUptime(r?.uptimeSeconds)}</DescriptionDetails>
        <DescriptionTerm>Chain ID</DescriptionTerm>
        <DescriptionDetails>
          {r?.contract?.chainId === undefined || r.contract.chainId === null ? '—' : String(r.contract.chainId)}
        </DescriptionDetails>
        <DescriptionTerm>Indexer interval</DescriptionTerm>
        <DescriptionDetails>{intervalDetail(scheduler?.intervalMs)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard title="Vault contract">
      <DescriptionList>
        <DescriptionTerm>Mode</DescriptionTerm>
        <DescriptionDetails>{r?.contract?.mode ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Address</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.contract?.contractAddress ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Code present</DescriptionTerm>
        <DescriptionDetails>{formatCodePresent(r?.contract?.codePresent)}</DescriptionDetails>
        <DescriptionTerm>Contract status</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(r?.contractStatus)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard title="Scheduler">
      <DescriptionList>
        <DescriptionTerm>Status</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(scheduler?.status)}</DescriptionDetails>
        <DescriptionTerm>Last success</DescriptionTerm>
        <DescriptionDetails>{formatDateTime(scheduler?.lastSuccessAt)}</DescriptionDetails>
        <DescriptionTerm>Last indexed block</DescriptionTerm>
        <DescriptionDetails>{blockDetail(scheduler?.lastIndexedBlock)}</DescriptionDetails>
        <DescriptionTerm>Consecutive errors</DescriptionTerm>
        <DescriptionDetails>{errorsDetail(scheduler?.consecutiveErrors)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard
        title="Indexer trigger"
        hint="Admin-only write. Ineffective while chain RPC is down."
      >
        <IndexerTriggerForm />
      </SectionCard>

      <div className="space-y-4">
        <p className="text-sm text-fg-muted dark:text-fg-secondary">
          Data coverage and source activity below are the canonical technical diagnostics for
          the console. Business pages no longer repeat these blocks.
        </p>
        <DataCoverageSection accountLabel={session.name} />
      </div>

      <SectionCard
        title="Raw responses"
        hint="Full probe payloads for technical verification — expand a probe only when needed."
      >
        <div className="divide-y divide-console-line-soft">
          {(
            [
              ['Runtime', runtime.ok ? jsonLisible(runtime.data) : null, !runtime.ok],
              ['Health', health.ok ? jsonLisible(health.data) : null, !health.ok],
              ['Ready', ready.ok ? jsonLisible(ready.data) : null, !ready.ok],
            ] as const
          ).map(([label, payload, failed]) => (
            <details key={label} className="group py-3 first:pt-0 last:pb-0">
              <summary className="cursor-pointer text-sm font-semibold text-ink dark:text-fg">
                {label}
              </summary>
              {failed ? (
                <div className="mt-3">
                  <Callout tone="danger">The {label.toLowerCase()} probe did not respond.</Callout>
                </div>
              ) : (
                <pre className={`${surfaceInset} mt-3 max-h-64 overflow-auto p-3 text-xs/5 text-fg`}>{payload}</pre>
              )}
            </details>
          ))}
        </div>
      </SectionCard>

      <Text>
        Side-effect keeper actions:{' '}
        <Link href="/admin/keeper" className="underline">
          Keeper
        </Link>
        {' · '}
        <Link href="/admin/api-explorer" className="underline">
          API explorer
        </Link>
      </Text>
    </div>
  )
}
