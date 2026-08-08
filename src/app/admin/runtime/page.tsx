import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { surfaceInset } from '@/components/admin/surface'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import clsx from 'clsx'
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
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import {
  runtimeMatrixStatus,
  runtimeStatusLabel,
  type RuntimePayload,
} from '@/lib/backend/runtime'
import { formatDateTime, formatNumber } from '@/lib/format'
import { etatSourceLisible, etatSourceLisibleCap } from '@/lib/mouvements'
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

export const metadata: Metadata = { title: 'Status du service' }
export const dynamic = 'force-dynamic'

/**
 * Status du service — Catalyst pur.
 * Sondes : runtime, health, ready — charge utile telle que renvoyée, sans réécriture.
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
  return `bloc ${formatNumber(numeric)}`
}

function errorsDetail(n: number | null | undefined): string {
  // Une absence de mesure n'est PAS « aucune erreur » : ce libellé est réservé
  // à un zéro réellement mesuré (n === 0). Sans mesure, l'écart reste nommé.
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  if (n > 0) return `${formatNumber(n)} erreur(s)`
  return 'aucune erreur'
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
      label: 'Contrat',
      status: runtimeMatrixStatus(r?.contractStatus ?? undefined),
      detail: runtimeStatusLabel(r?.contractStatus),
    },
    {
      id: 'indexer',
      label: 'Indexeur',
      status: runtimeMatrixStatus(r?.indexerStatus ?? undefined),
      detail: blockDetail(scheduler?.lastIndexedBlock),
    },
    {
      id: 'scheduler',
      label: 'Ordonnanceur',
      status: runtimeMatrixStatus(scheduler?.status ?? undefined),
      detail: errorsDetail(scheduler?.consecutiveErrors),
    },
  ]
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
      value: editorial(etatSourceLisibleCap(health.ok ? 'LIVE' : 'UNAVAILABLE')),
      icon: HeartIcon,
    },
    {
      id: 'ready',
      title: 'Ready',
      value: editorial(etatSourceLisibleCap(readyOk ? 'LIVE' : 'UNAVAILABLE')),
      icon: CheckCircleIcon,
    },
    {
      id: 'indexer',
      title: 'Indexeur',
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
        title="Status du service"
        description="Runtime, health, and ready probes — state declared by the backend, without rewriting."
        kpis={kpis}
      />

      <DataTableShell
        title="State matrix"
        description="Dependencies and operational probes."
      >
        <TableHead>
          <TableRow>
            <TableHeader>Composant</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Detail</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{etatSourceLisible(row.status)}</TableCell>
              <TableCell>{row.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard
        title="Deployment"
        hint="Version, environment, and scheduler settings as reported by the runtime probe."
      >
      <DescriptionList>
        <DescriptionTerm>Environnement</DescriptionTerm>
        <DescriptionDetails>{r?.environment ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Version</DescriptionTerm>
        <DescriptionDetails>{r?.serviceVersion ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Commit</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.commitSha ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Availability</DescriptionTerm>
        <DescriptionDetails>{formatUptime(r?.uptimeSeconds)}</DescriptionDetails>
        <DescriptionTerm>Chain</DescriptionTerm>
        <DescriptionDetails>
          {r?.contract?.chainId === undefined || r.contract.chainId === null ? '—' : String(r.contract.chainId)}
        </DescriptionDetails>
        <DescriptionTerm>Intervalle de l’indexeur</DescriptionTerm>
        <DescriptionDetails>{intervalDetail(scheduler?.intervalMs)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard title="Contrat">
      <DescriptionList>
        <DescriptionTerm>Mode</DescriptionTerm>
        <DescriptionDetails>{r?.contract?.mode ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Adresse</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.contract?.contractAddress ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Code present</DescriptionTerm>
        <DescriptionDetails>
          {r?.contract?.codePresent === undefined || r.contract.codePresent === null
            ? '—'
            : r.contract.codePresent
              ? 'Oui'
              : 'Non'}
        </DescriptionDetails>
        <DescriptionTerm>Status du contrat</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(r?.contractStatus)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard title="Ordonnanceur">
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
        hint="POST /api/v1/admin/indexer/trigger — admin only. Ineffective while chain RPC is down."
      >
        <IndexerTriggerForm />
      </SectionCard>

      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The summary tiles below reflect the state declared by the{' '}
          <span className="font-mono">/api/v1/dashboard</span> : when that state is unavailable, they
          show &quot;Unavailable&quot;. Per-surface detail lists fields actually present in
          the payload, and source activity comes from another read — unavailable summary
          does not contradict the detailed counts below.
        </p>
        <DataCoverageSection compteLabel={session.name} />
      </div>

      <SectionCard
        title="Raw responses"
        hint="Full payload for technical verification — no probe value is rewritten by the frontend."
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Runtime</h3>
            {runtime.ok ? (
              <pre className={clsx(surfaceInset, 'overflow-x-auto p-4 text-xs/5 text-zinc-300')}>
                {jsonLisible(runtime.data)}
              </pre>
            ) : (
              <Callout tone="danger">The runtime probe did not respond.</Callout>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Health (health)</h3>
            {health.ok ? (
              <pre className={clsx(surfaceInset, 'overflow-x-auto p-4 text-xs/5 text-zinc-300')}>
                {jsonLisible(health.data)}
              </pre>
            ) : (
              <Callout tone="danger">The liveness probe did not respond.</Callout>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Ready</h3>
            {ready.ok ? (
              <pre className={clsx(surfaceInset, 'overflow-x-auto p-4 text-xs/5 text-zinc-300')}>
                {jsonLisible(ready.data)}
              </pre>
            ) : (
              <Callout tone="danger">The readiness probe did not respond.</Callout>
            )}
          </div>
        </div>
      </SectionCard>

      <Text>
        Side-effect operations actions:{' '}
        <Link href="/admin/keeper" className="underline">
          Actions Keeper
        </Link>
        {' · '}
        <Link href="/admin/api-explorer" className="underline">
          API explorer
        </Link>
      </Text>
    </div>
  )
}
