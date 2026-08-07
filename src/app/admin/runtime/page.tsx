import { AdminPageHeader } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
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
import {
  Callout,
  DataTableShell,
  SectionCard,
  StatCard,
  StatGrid,
} from '@/components/compositions'
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

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="État du service"
        description="Vivacité, disponibilité et charge utile de l’exécution — chaque valeur provient des sondes backend, sans réécriture frontend."
      />

      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Actions d’exploitation à effet de bord :{' '}
        <Link href="/admin/keeper" className="font-medium text-zinc-950 underline dark:text-white">
          Actions Keeper
        </Link>
        . Explorateur technique :{' '}
        <Link href="/admin/api-explorer" className="font-medium text-zinc-950 underline dark:text-white">
          Explorateur d’API
        </Link>
        .
      </p>

      <StatGrid label="Sondes de service" columns={3}>
        <StatCard titre="Santé" valeur={editorial(etatSourceLisibleCap(health.ok ? 'LIVE' : 'UNAVAILABLE'))} hint="Vivacité (health)" />
        <StatCard titre="Prêt" valeur={editorial(etatSourceLisibleCap(readyOk ? 'LIVE' : 'UNAVAILABLE'))} hint="Disponibilité (ready)" />
        <StatCard titre="Base de données" valeur={editorial(runtimeStatusLabel(r?.databaseStatus))} />
        <StatCard titre="Indexeur" valeur={editorial(runtimeStatusLabel(r?.indexerStatus))} />
        <StatCard titre="Environnement" valeur={editorial(r?.environment ?? 'Non renseigné')} />
        <StatCard titre="Version" valeur={editorial(r?.serviceVersion ?? 'Non renseignée')} />
      </StatGrid>

      <DataTableShell
        title="Matrice d’état"
        description="Dépendances et sondes opérationnelles."
      >
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
              <TableCell>{etatSourceLisible(row.status)}</TableCell>
              <TableCell>{row.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard
        title="Déploiement"
        hint="Version, environnement et paramètres de l’ordonnanceur tels que rapportés par la sonde d’exécution."
      >
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
      </SectionCard>

      <SectionCard title="Contrat">
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
      </SectionCard>

      <SectionCard title="Ordonnanceur">
      <DescriptionList>
        <DescriptionTerm>État</DescriptionTerm>
        <DescriptionDetails>{runtimeStatusLabel(scheduler?.status)}</DescriptionDetails>
        <DescriptionTerm>Dernière réussite</DescriptionTerm>
        <DescriptionDetails>{formatDateTime(scheduler?.lastSuccessAt)}</DescriptionDetails>
        <DescriptionTerm>Dernier bloc indexé</DescriptionTerm>
        <DescriptionDetails>{blockDetail(scheduler?.lastIndexedBlock)}</DescriptionDetails>
        <DescriptionTerm>Erreurs consécutives</DescriptionTerm>
        <DescriptionDetails>{errorsDetail(scheduler?.consecutiveErrors)}</DescriptionDetails>
      </DescriptionList>
      </SectionCard>

      <SectionCard
        title="Déclenchement indexeur"
        hint="POST /api/v1/admin/indexer/trigger — admin uniquement. Inefficace tant que le RPC chaîne est down."
      >
        <IndexerTriggerForm />
      </SectionCard>

      <div className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Les tuiles de synthèse ci-dessous reflètent l’état déclaré par l’enveloppe{' '}
          <span className="font-mono">/api/v1/dashboard</span> : quand cet état est indisponible, elles
          affichent « Indisponible ». Le détail par surface énumère les champs effectivement présents dans
          la charge utile, et l’activité des sources provient d’un autre relevé — une synthèse indisponible
          ne contredit donc pas les décomptes détaillés plus bas.
        </p>
        <DataCoverageSection compteLabel={session.name} />
      </div>

      <SectionCard
        title="Réponses brutes"
        hint="Charge utile complète pour vérification technique — aucune valeur de sonde n’est réécrite par le frontend."
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Exécution (runtime)</h3>
            {runtime.ok ? (
              <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                {jsonLisible(runtime.data)}
              </pre>
            ) : (
              <Callout tone="danger">La sonde d’exécution n’a pas répondu.</Callout>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Santé (health)</h3>
            {health.ok ? (
              <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                {jsonLisible(health.data)}
              </pre>
            ) : (
              <Callout tone="danger">La sonde de vivacité n’a pas répondu.</Callout>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-500">Prêt (ready)</h3>
            {ready.ok ? (
              <pre className="overflow-x-auto rounded-lg bg-zinc-950/5 p-4 text-xs/5 text-zinc-700 dark:bg-white/5 dark:text-zinc-300">
                {jsonLisible(ready.data)}
              </pre>
            ) : (
              <Callout tone="danger">La sonde de disponibilité n’a pas répondu.</Callout>
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
