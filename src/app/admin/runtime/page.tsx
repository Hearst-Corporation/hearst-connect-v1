import { EndpointSection } from '@/components/admin/endpoint-section'
import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Panel, Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import {
  AdminMetric,
  AdminSection,
  AdminStatusMatrix,
  type StatusMatrixRow,
} from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { formatNumber } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'État du service' }
export const dynamic = 'force-dynamic'


/**
 * BAPI-03: the type now matches the ACTUAL non-enveloped /api/v1/runtime
 * payload (verified against production, 2026-08-04). The service reports the
 * version as `serviceVersion` (not `version`) and the chain under
 * `contract.chainId` (not a top-level `chainId`) — reading the old paths made
 * the Version and Chain fields render empty even though the backend supplies them.
 */
type Runtime = {
  readonly databaseStatus?: string
  readonly contractStatus?: string
  readonly indexerStatus?: string
  readonly environment?: string
  readonly uptimeSeconds?: number
  readonly serviceVersion?: string
  readonly commitSha?: string | null
  readonly contract?: {
    readonly mode?: string
    readonly chainId?: number
    readonly contractAddress?: string
    readonly codePresent?: boolean
  }
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
  if (seconds === undefined || !Number.isFinite(seconds)) return '—'
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
      return raw ?? 'Non renseigné'
  }
}

function latencyDetail(ms: number | null | undefined): string | undefined {
  if (ms === null || ms === undefined) return undefined
  return `${ms} ms`
}

function blockDetail(block: number | null | undefined): string | undefined {
  if (block === null || block === undefined) return undefined
  return `bloc ${formatNumber(block)}`
}

function errorsDetail(n: number | undefined): string {
  if (n !== undefined && n > 0) return `${n} erreur(s)`
  return 'aucune erreur'
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
      label: 'Vivacité (health)',
      status: healthOk ? 'LIVE' : 'UNAVAILABLE',
      detail: healthOk ? 'HTTP 200' : 'Aucune réponse',
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
      status: statusFromRaw(r?.databaseStatus),
      detail: latencyDetail(r?.db?.latencyMs),
      ton: statusTone(r?.databaseStatus),
    },
    {
      id: 'contract',
      label: 'Contrat',
      status: statusFromRaw(r?.contractStatus),
      detail: statusLabel(r?.contractStatus),
      ton: statusTone(r?.contractStatus),
    },
    {
      id: 'indexer',
      label: 'Indexeur',
      status: statusFromRaw(r?.indexerStatus),
      detail: blockDetail(scheduler?.lastIndexedBlock),
      ton: statusTone(r?.indexerStatus),
    },
    {
      id: 'scheduler',
      label: 'Ordonnanceur',
      status: statusFromRaw(scheduler?.status),
      detail: errorsDetail(scheduler?.consecutiveErrors),
      ton: statusTone(scheduler?.status),
    },
  ]
}

export default async function RuntimePage() {
  const session = await requireSession()
  const user = publicUser(session)
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
    <ConsoleShell
      label="Poste de pilotage exécution Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/runtime" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé de l’exécution">
        <Panel className={gcc.metricCard}><h2>Santé</h2><div className={gcc.metricText}><Reading value={editorial(health.ok ? 'LIVE' : 'UNAVAILABLE')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Prêt</h2><div className={gcc.metricText}><Reading value={editorial(readyOk ? 'LIVE' : 'UNAVAILABLE')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Base de données</h2><div className={gcc.metricText}><Reading value={editorial(statusLabel(r?.databaseStatus))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Indexeur</h2><div className={gcc.metricText}><Reading value={editorial(statusLabel(r?.indexerStatus))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Environnement</h2><div className={gcc.metricText}><Reading value={editorial(r?.environment ?? 'Non renseigné')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>État <span>de l’exécution</span></p>
          <p className={gcc.decisionMeta}>{r?.serviceVersion ?? 'Version non renseignée'}</p>
          <p className={gcc.decisionActionMuted}>Matrice + sondes brutes</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Matrice d’exécution et déploiement">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Exécution et infrastructure</h2></div>
          <div className={gcc.heroBody}>
      {/*
        The matrix is a single full-width list card and is therefore the section's
        direct child: wrapping one surface in a one-column grid would be an empty
        container around another surface. Its own card title is gone too — the
        section's H2 already names it, and an H3 repeating it inside the card was
        a second header for one piece of content.
      */}
      <AdminSection title="Matrice d’état" description="Dépendances et sondes opérationnelles">
        <AdminStatusMatrix rows={matrix} />
      </AdminSection>

      {/*
        Deployment facts: six peers, no headline among them, so they compose as a
        balanced 3 Ã 2 block rather than the old `sm:grid-cols-2 lg:grid-cols-4`,
        which put four on the first row and marooned two on the left of an empty
        one.

        `AdminMetricGrid count={6}` would give `lg:grid-cols-6`; at 1440 that is
        roughly 165px per tile, too thin for a commit SHA or an environment name
        at the standard numeric size. Explicit spans on the 12-column grid give a
        full last row at every breakpoint: 3 across at lg (span 4), 2 at md
        (md 4 of 8), 1 at base — 6, 6 and 6 tiles with nothing stranded.

        Order is by meaning, one row per idea: deployment identity, then running
        state. Every tile carries exactly one caption — the runtime field it
        reads — so the tiles in a row are the same height and the caption doubles
        as provenance on a page whose job is technical verification.
      */}
      <AdminSection
        title="Déploiement"
        description="Version, environnement et paramètres de l’ordonnanceur tels que rapportés par la sonde d’exécution"
      >
        <AdminGrid>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Environnement" value={r?.environment ?? null} hint="environment" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Version" value={r?.serviceVersion ?? null} hint="version" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Commit" value={r?.commitSha ?? null} hint="commitSha" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Disponibilité" value={formatUptime(r?.uptimeSeconds)} hint="uptimeSeconds" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric label="Chaîne" value={r?.contract?.chainId ?? null} hint="chainId" />
          </AdminCol>
          <AdminCol span={4} md={4}>
            <AdminMetric
              label="Intervalle de l’indexeur"
              value={intervalDetail(scheduler?.intervalMs)}
              hint="indexerScheduler.intervalMs"
            />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Disponibilité</h3><p className={gcc.signalValue}>{formatUptime(r?.uptimeSeconds)}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Chaîne</h3><p className={gcc.signalValue}>{r?.contract?.chainId === undefined ? "—" : String(r.contract.chainId)}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Ordonnanceur</h3><p className={gcc.cellText}>{scheduler?.status ?? 'Non renseigné'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Réponses brutes de l’exécution">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Réponses brutes</h3></div>
          <div className={gcc.heroBody}>
      {/*
        Raw payloads. The runtime probe carries the whole deployment picture and
        takes the full 12 columns; health and ready are one-line orchestrator
        answers and pair off at 6 each, so the row closes exactly. Declared spans
        rather than a bare `lg:grid-cols-2`, which left the runtime block and the
        pair on two unrelated grids.
      */}
      <AdminSection title="Réponses brutes" description="Charge utile complète pour vérification technique">
        <AdminGrid>
          <AdminCol span={12}>
            <EndpointSection endpointId="runtime" title="Exécution" />
          </AdminCol>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="health" title="Santé" />
          </AdminCol>
          <AdminCol span={6} md={4}>
            <EndpointSection endpointId="ready" title="Prêt" />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Sonde de santé</h3><p className={gcc.cellText}>Point d’accès de vivacité</p></article>
          <article className={gcc.infoCell}><h3>Sonde de disponibilité</h3><p className={gcc.cellText}>Point d’accès de disponibilité</p></article>
          <article className={gcc.infoCell}><h3>Sonde d’exécution</h3><p className={gcc.cellText}>Charge utile de l’environnement et de l’ordonnanceur</p></article>
          <article className={gcc.infoCell}><h3>Contrat</h3><p className={gcc.cellText}>Aucune valeur de sonde n’est réécrite par le frontend</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Chemin de couverture</h3>
          <p className={gcc.cellText}>Utilisez `/admin/dashboard` pour l’état des surfaces au niveau des points d’accès.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
