import { AdminProbeResult } from '@/components/admin/admin-probe-result'
import { DashCard, PanelHeaderLink } from '@/components/admin/dashboard'
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
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: 'Service' }
export const dynamic = 'force-dynamic'

/**
 * Service — la santé technique du backend : dépendances, runtime, contrat,
 * scheduler, et les réponses brutes des sondes. Lecture seule : les gestes
 * techniques (déclencher l'indexeur, déclarer les métriques) vivent dans Keeper.
 *
 * Les cartes d'une rangée finissent à la même ligne (la grille les étire) et
 * montrent TOUT leur contenu : plus de hauteur figée avec un défilement caché,
 * qui rognait la dernière ligne du tableau et en masquait deux autres.
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

function ServicePanel({
  title,
  subtitle,
  action,
  children,
}: Readonly<{
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}>) {
  return (
    <DashCard className="min-w-0" title={title} subtitle={subtitle} action={action}>
      {children}
    </DashCard>
  )
}

export default async function RuntimePage() {
  await requireSession()
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
        description="Backend health — dependencies, runtime, contract and scheduler. Technical actions live in Keeper."
        kpis={kpis}
      />

      {/* Row A — the dependency matrix beside the runtime identity card. */}
      <BentoGrid>
        <BentoCard span={8}>
          <ServicePanel
            title="System overview"
            subtitle="Dependencies and operational probes."
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

      {/* Row B — the contract and the scheduler, side by side. */}
      <BentoGrid>
        <BentoCard span={6}>
          <ServicePanel title="Vault contract">
            <FieldList>
              <FieldRow term="Mode">{r?.contract?.mode ?? '—'}</FieldRow>
              <FieldRow term="Address" mono>{r?.contract?.contractAddress ?? '—'}</FieldRow>
              <FieldRow term="Code present">{formatCodePresent(r?.contract?.codePresent)}</FieldRow>
              <FieldRow term="Contract status">{runtimeStatusLabel(r?.contractStatus)}</FieldRow>
            </FieldList>
          </ServicePanel>
        </BentoCard>
        <BentoCard span={6}>
          <ServicePanel title="Scheduler">
            <FieldList>
              <FieldRow term="Status">{runtimeStatusLabel(scheduler?.status)}</FieldRow>
              <FieldRow term="Last success">{formatDateTime(scheduler?.lastSuccessAt)}</FieldRow>
              <FieldRow term="Last indexed block">{blockDetail(scheduler?.lastIndexedBlock)}</FieldRow>
              <FieldRow term="Consecutive errors">{errorsDetail(scheduler?.consecutiveErrors)}</FieldRow>
            </FieldList>
          </ServicePanel>
        </BentoCard>
      </BentoGrid>

      {/* Row D — probe payloads: one thin band, expanded only on demand. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            className="min-w-0"
            title="Raw responses"
            subtitle="Full probe payloads for technical verification — expand a probe only when needed."
            action={<PanelHeaderLink href="/admin/settings/developer/api">API explorer</PanelHeaderLink>}
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
