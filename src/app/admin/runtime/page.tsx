import { AdminProbeResult } from '@/components/admin/admin-probe-result'
import { DashCard, PanelFallback, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { StatusBadge } from '@/components/admin/truthful'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, tableCol } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import {
  runtimeMatrixStatus,
  runtimeStatusLabel,
  type RuntimePayload,
} from '@/lib/backend/runtime'
import { formatDateTime, formatNumber } from '@/lib/format'
import { readableSourceStateCap } from '@/lib/movements'
import { editorial } from '@/lib/vaults/model'
import { DataCoverageSection } from '@/features/admin-runtime/data-coverage-section'
import { FieldList, FieldRow } from '@/features/admin-runtime/field-list'
import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import {
  CheckCircleIcon,
  CpuChipIcon,
  HeartIcon,
  TagIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { Suspense, type ReactNode } from 'react'
import { IndexerTriggerForm } from './indexer-trigger-form'

export const metadata: Metadata = { title: 'Service' }
export const dynamic = 'force-dynamic'

/**
 * Service — single technical observability surface (runtime, coverage, probes).
 * Business pages must not duplicate these diagnostics.
 *
 * Cockpit shape (same doctrine as /admin): explicit Bento rows whose column
 * heights match by construction, frozen content slots that scroll inside
 * (`scrollbar-none`), links on the card title row — never a footer strip.
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

/**
 * Fixed content slots (px) — the box is FROZEN whether the probe is live,
 * degraded, or absent; taller content scrolls inside the box. Row-matched:
 *   row A: matrix 292 + header 76 == runtime 292 + header 76.
 *   row B: three span-4 cards share one 192 slot (4 field rows ≈ the form).
 */
const PANEL_SLOT_CLASS = {
  matrix: 'h-[292px] overflow-y-auto scrollbar-none',
  runtime: 'h-[292px] overflow-y-auto scrollbar-none',
  detail: 'h-[192px] overflow-y-auto scrollbar-none',
} as const

type PanelSlot = keyof typeof PANEL_SLOT_CLASS

function ServicePanel({
  title,
  subtitle,
  action,
  slot,
  children,
}: Readonly<{
  title: string
  subtitle?: string
  action?: ReactNode
  slot: PanelSlot
  children: ReactNode
}>) {
  return (
    <DashCard
      className="min-w-0"
      contentClassName={PANEL_SLOT_CLASS[slot]}
      title={title}
      subtitle={subtitle}
      action={action}
    >
      {children}
    </DashCard>
  )
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
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Service"
        description="Technical observability — dependency health, runtime, data coverage, and endpoint status."
        kpis={kpis}
      />

      {/* Row A — the dependency matrix beside the runtime identity card. */}
      <BentoGrid>
        <BentoCard span={8}>
          <ServicePanel
            title="System overview"
            subtitle="Dependencies and operational probes."
            slot="matrix"
          >
            <AdminTable>
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
                    <TableCell className={tableCol.status}>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className={tableCol.primary}>{row.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </AdminTable>
          </ServicePanel>
        </BentoCard>
        <BentoCard span={4}>
          <ServicePanel
            title="Runtime"
            subtitle="Environment, version, chain, and scheduler as reported by the runtime probe."
            slot="runtime"
          >
            <FieldList>
              <FieldRow term="Environment">{r?.environment ?? '—'}</FieldRow>
              <FieldRow term="Version">{r?.serviceVersion ?? '—'}</FieldRow>
              <FieldRow term="Commit" mono>{r?.commitSha ?? '—'}</FieldRow>
              <FieldRow term="Uptime">{formatUptime(r?.uptimeSeconds)}</FieldRow>
              <FieldRow term="Chain ID">
                {r?.contract?.chainId === undefined || r.contract.chainId === null ? '—' : String(r.contract.chainId)}
              </FieldRow>
              <FieldRow term="Indexer interval">{intervalDetail(scheduler?.intervalMs)}</FieldRow>
            </FieldList>
          </ServicePanel>
        </BentoCard>
      </BentoGrid>

      {/* Row B — three equal flank cards: contract, scheduler, and the one write. */}
      <BentoGrid>
        <BentoCard span={4}>
          <ServicePanel title="Vault contract" slot="detail">
            <FieldList>
              <FieldRow term="Mode">{r?.contract?.mode ?? '—'}</FieldRow>
              <FieldRow term="Address" mono>{r?.contract?.contractAddress ?? '—'}</FieldRow>
              <FieldRow term="Code present">{formatCodePresent(r?.contract?.codePresent)}</FieldRow>
              <FieldRow term="Contract status">{runtimeStatusLabel(r?.contractStatus)}</FieldRow>
            </FieldList>
          </ServicePanel>
        </BentoCard>
        <BentoCard span={4}>
          <ServicePanel title="Scheduler" slot="detail">
            <FieldList>
              <FieldRow term="Status">{runtimeStatusLabel(scheduler?.status)}</FieldRow>
              <FieldRow term="Last success">{formatDateTime(scheduler?.lastSuccessAt)}</FieldRow>
              <FieldRow term="Last indexed block">{blockDetail(scheduler?.lastIndexedBlock)}</FieldRow>
              <FieldRow term="Consecutive errors">{errorsDetail(scheduler?.consecutiveErrors)}</FieldRow>
            </FieldList>
          </ServicePanel>
        </BentoCard>
        <BentoCard span={4}>
          <ServicePanel
            title="Indexer trigger"
            subtitle="Admin-only write. Ineffective while chain RPC is down."
            slot="detail"
            action={<PanelHeaderLink href="/admin/keeper">Keeper</PanelHeaderLink>}
          >
            <IndexerTriggerForm />
          </ServicePanel>
        </BentoCard>
      </BentoGrid>

      {/* Row C — coverage: the canonical technical diagnostics, streamed. */}
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm text-fg-secondary">
          Data coverage and source activity below are the canonical technical diagnostics for
          the console. Business pages no longer repeat these blocks.
        </p>
        <Suspense fallback={<PanelFallback label="Loading coverage…" />}>
          <DataCoverageSection accountLabel={session.name} />
        </Suspense>
      </div>

      {/* Row D — probe payloads: one thin band, expanded only on demand. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            title="Raw responses"
            subtitle="Full probe payloads for technical verification — expand a probe only when needed."
            action={<PanelHeaderLink href="/admin/api-explorer">API explorer</PanelHeaderLink>}
          >
            <div className="divide-y divide-console-line-soft">
              {(
                [
                  ['Runtime', runtime],
                  ['Health', health],
                  ['Ready', ready],
                ] as const
              ).map(([label, result]) => (
                <details key={label} className="group py-3 first:pt-0 last:pb-0">
                  <summary className="cursor-pointer text-sm font-semibold text-fg">
                    {label}
                  </summary>
                  <div className="mt-3">
                    <AdminProbeResult
                      status={result.ok ? 'LIVE' : result.state.status}
                      reason={result.ok ? null : result.state.reason}
                      trace={result.trace}
                      rawJson={result.ok ? jsonLisible(result.data) : undefined}
                      problem={result.ok ? null : result.problem}
                      keeper={result.ok ? null : result.keeper}
                    />
                  </div>
                </details>
              ))}
            </div>
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </div>
  )
}
