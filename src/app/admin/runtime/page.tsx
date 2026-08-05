import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import {
  runtimeMatrixStatus,
  runtimeStatusLabel,
  type RuntimePayload,
} from '@/lib/backend/runtime'
import { formatNumber } from '@/lib/format'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import { IndexerTriggerForm } from './indexer-trigger-form'

export const metadata: Metadata = { title: 'État du service' }
export const dynamic = 'force-dynamic'

/**
 * État du service — Catalyst pur.
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
  if (n !== null && n !== undefined && n > 0) return `${formatNumber(n)} erreur(s)`
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
      label: 'Vivacité (health)',
      status: healthOk ? 'LIVE' : 'UNAVAILABLE',
      detail: healthOk ? 'HTTP 200' : 'Aucune réponse',
    },
    {
      id: 'ready',
      label: 'Disponibilité (ready)',
      status: readyOk ? 'LIVE' : 'UNAVAILABLE',
      detail: readyOk ? (readyDb ?? '—') : 'Non prêt',
    },
    {
      id: 'db',
      label: 'Base de données',
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

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="État du service"
        description="Vivacité, disponibilité et charge utile de l’exécution — chaque valeur provient des sondes backend, sans réécriture frontend."
      />

      <DescriptionList>
        <DescriptionTerm>Santé</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(health.ok ? 'LIVE' : 'UNAVAILABLE')} />
        </DescriptionDetails>
        <DescriptionTerm>Prêt</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(readyOk ? 'LIVE' : 'UNAVAILABLE')} />
        </DescriptionDetails>
        <DescriptionTerm>Base de données</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(runtimeStatusLabel(r?.databaseStatus))} />
        </DescriptionDetails>
        <DescriptionTerm>Indexeur</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(runtimeStatusLabel(r?.indexerStatus))} />
        </DescriptionDetails>
        <DescriptionTerm>Environnement</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(r?.environment ?? 'Non renseigné')} />
        </DescriptionDetails>
        <DescriptionTerm>Version</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(r?.serviceVersion ?? 'Non renseignée')} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Matrice d’état"
        description="Dépendances et sondes opérationnelles."
      />
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Composant</TableHeader>
            <TableHeader>État</TableHeader>
            <TableHeader>Détail</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {matrix.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>{row.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdminSectionHeading
        title="Déploiement"
        description="Version, environnement et paramètres de l’ordonnanceur tels que rapportés par la sonde d’exécution."
      />
      <DescriptionList>
        <DescriptionTerm>Environnement</DescriptionTerm>
        <DescriptionDetails>{r?.environment ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Version</DescriptionTerm>
        <DescriptionDetails>{r?.serviceVersion ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Commit</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.commitSha ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Disponibilité</DescriptionTerm>
        <DescriptionDetails>{formatUptime(r?.uptimeSeconds)}</DescriptionDetails>
        <DescriptionTerm>Chaîne</DescriptionTerm>
        <DescriptionDetails>
          {r?.contract?.chainId === undefined || r.contract.chainId === null ? '—' : String(r.contract.chainId)}
        </DescriptionDetails>
        <DescriptionTerm>Intervalle de l’indexeur</DescriptionTerm>
        <DescriptionDetails>{intervalDetail(scheduler?.intervalMs)}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="Contrat" />
      <DescriptionList>
        <DescriptionTerm>Mode</DescriptionTerm>
        <DescriptionDetails>{r?.contract?.mode ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Adresse</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{r?.contract?.contractAddress ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Code présent</DescriptionTerm>
        <DescriptionDetails>
          {r?.contract?.codePresent === undefined || r.contract.codePresent === null
            ? '—'
            : r.contract.codePresent
              ? 'Oui'
              : 'Non'}
        </DescriptionDetails>
        <DescriptionTerm>État du contrat</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(r?.contractStatus)}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="Ordonnanceur" />
      <DescriptionList>
        <DescriptionTerm>État</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(scheduler?.status)}</DescriptionDetails>
        <DescriptionTerm>Dernière réussite</DescriptionTerm>
        <DescriptionDetails>{scheduler?.lastSuccessAt ?? '—'}</DescriptionDetails>
        <DescriptionTerm>Dernier bloc indexé</DescriptionTerm>
        <DescriptionDetails>{blockDetail(scheduler?.lastIndexedBlock)}</DescriptionDetails>
        <DescriptionTerm>Erreurs consécutives</DescriptionTerm>
        <DescriptionDetails>{errorsDetail(scheduler?.consecutiveErrors)}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Déclenchement indexeur"
        description="POST /api/v1/admin/indexer/trigger — admin uniquement. Inefficace tant que le RPC chaîne est down."
      />
      <IndexerTriggerForm />

      <AdminSectionHeading
        title="Réponses brutes"
        description="Charge utile complète pour vérification technique — aucune valeur de sonde n’est réécrite par le frontend."
      />
      <AdminSectionHeading title="Exécution (runtime)" />
      {runtime.ok ? (
        <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
          {jsonLisible(runtime.data)}
        </pre>
      ) : (
        <Text>La sonde d’exécution n’a pas répondu.</Text>
      )}

      <AdminSectionHeading title="Santé (health)" />
      {health.ok ? (
        <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
          {jsonLisible(health.data)}
        </pre>
      ) : (
        <Text>La sonde de vivacité n’a pas répondu.</Text>
      )}

      <AdminSectionHeading title="Prêt (ready)" />
      {ready.ok ? (
        <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
          {jsonLisible(ready.data)}
        </pre>
      ) : (
        <Text>La sonde de disponibilité n’a pas répondu.</Text>
      )}
    </div>
  )
}
