import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import {
  AdminMetric,
  AdminSection,
  AdminStatusMatrix,
  type StatusMatrixRow,
} from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'État du service' }
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

function duree(secondes: number | undefined): string {
  if (secondes === undefined || !Number.isFinite(secondes)) return '—'
  if (secondes < 120) return `${Math.round(secondes)} s`
  const minutes = Math.round(secondes / 60)
  if (minutes < 120) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}

function tonEtat(brut: string | undefined): StatusMatrixRow['ton'] {
  if (brut === 'ready' || brut === 'CONFIGURED' || brut === 'RUNNING' || brut === 'running') return 'sain'
  if (brut === 'NOT_CONFIGURED' || brut === 'disabled') return 'attention'
  if (brut === 'unreachable') return 'critique'
  return 'neutre'
}

function statutFromBrut(brut: string | undefined): 'LIVE' | 'PARTIAL' | 'UNAVAILABLE' {
  if (brut === 'ready' || brut === 'CONFIGURED' || brut === 'RUNNING' || brut === 'running') return 'LIVE'
  if (brut === undefined) return 'UNAVAILABLE'
  return 'PARTIAL'
}

function libelleEtat(brut: string | undefined): string {
  switch (brut) {
    case 'ready':
      return 'Joignable'
    case 'CONFIGURED':
      return 'Configuré'
    case 'RUNNING':
      return 'En cours'
    case 'running':
      return 'Actif'
    case 'NOT_CONFIGURED':
      return 'Non configuré'
    case 'unreachable':
      return 'Injoignable'
    case 'disabled':
      return 'Désactivé'
    default:
      return brut ?? 'Non communiqué'
  }
}

function detailLatence(ms: number | null | undefined): string | undefined {
  if (ms === null || ms === undefined) return undefined
  return `${ms} ms`
}

function detailBloc(bloc: number | null | undefined): string | undefined {
  if (bloc === null || bloc === undefined) return undefined
  return `bloc ${bloc.toLocaleString('fr-FR')}`
}

function detailErreurs(n: number | undefined): string {
  if (n !== undefined && n > 0) return `${n} erreur(s)`
  return 'aucune erreur'
}

function intervalleMs(ms: number | null | undefined): string | null {
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
      label: 'Vivacité (health)',
      status: healthOk ? 'LIVE' : 'UNAVAILABLE',
      detail: healthOk ? 'HTTP 200' : 'Pas de réponse',
      ton: healthOk ? 'sain' : 'critique',
    },
    {
      id: 'ready',
      label: 'Disponibilité (ready)',
      status: readyLive ? 'LIVE' : 'UNAVAILABLE',
      detail: readyOk ? readyDb : undefined,
      ton: readyLive ? 'sain' : 'critique',
    },
    {
      id: 'db',
      label: 'Base de données',
      status: statutFromBrut(r?.databaseStatus),
      detail: detailLatence(r?.db?.latencyMs),
      ton: tonEtat(r?.databaseStatus),
    },
    {
      id: 'contract',
      label: 'Contrat',
      status: statutFromBrut(r?.contractStatus),
      detail: libelleEtat(r?.contractStatus),
      ton: tonEtat(r?.contractStatus),
    },
    {
      id: 'indexer',
      label: 'Indexeur',
      status: statutFromBrut(r?.indexerStatus),
      detail: detailBloc(scheduler?.lastIndexedBlock),
      ton: tonEtat(r?.indexerStatus),
    },
    {
      id: 'scheduler',
      label: 'Planificateur',
      status: statutFromBrut(scheduler?.status),
      detail: detailErreurs(scheduler?.consecutiveErrors),
      ton: tonEtat(scheduler?.status),
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
    <div className="space-y-8">
      <PageHeader
        title="Runtime et infrastructure"
        description="Matrice d’état, métriques de déploiement et réponses brutes des sondes."
        endpointIds={['health', 'ready', 'runtime']}
      />

      <AdminSection title="Matrice d’état" description="Dépendances et sondes opérationnelles">
        <AdminStatusMatrix title="Services et dépendances" rows={matrix} />
      </AdminSection>

      <AdminSection title="Déploiement" description="Version et environnement — runtime">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric label="Environnement" value={r?.environment ?? null} />
          <AdminMetric label="Uptime" value={duree(r?.uptimeSeconds)} />
          <AdminMetric label="Version" value={r?.version ?? null} />
          <AdminMetric label="Commit" value={r?.commitSha ?? null} hint="SHA du déploiement" />
          <AdminMetric label="Chaîne" value={r?.chainId ?? null} hint="chainId" />
          <AdminMetric label="Intervalle indexeur" value={intervalleMs(scheduler?.intervalMs)} />
        </div>
      </AdminSection>

      <AdminSection title="Réponses brutes" description="Payload complet pour vérification technique">
        <EndpointSection endpointId="runtime" title="Runtime" />
        <div className="grid gap-4 lg:grid-cols-2">
          <EndpointSection endpointId="health" title="Health" />
          <EndpointSection endpointId="ready" title="Ready" />
        </div>
      </AdminSection>
    </div>
  )
}
