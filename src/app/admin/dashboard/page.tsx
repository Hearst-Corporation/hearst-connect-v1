import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { publicUser } from '@/lib/session'
import { available, unavailable, type Availability } from '@/lib/vaults/model'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Couverture des données' }
export const dynamic = 'force-dynamic'

/**
 * Data Coverage — which product surfaces are actually served.
 *
 * The aggregate returned by the service describes eighteen business
 * surfaces, each with its own status. This is THE question this page
 * answers: what can we rely on today, and what's missing elsewhere, and why.
 *
 * Three choices govern it:
 *
 * 1. We don't show the raw payload. A screen of JSON teaches nothing to
 *    someone who has to decide.
 *
 * 2. We don't requalify any status. The service computes the overall status
 *    worst-field-first: a single degraded surface pulls down the whole. This
 *    is documented behavior — we explain it rather than fix it. A frontend
 *    that "improves" an upstream status lies to its reader.
 *
 * 3. Eighteen surfaces are ONE list, not three framed panels. The rejected
 *    version put each status tier in its own card, so the reader compared
 *    boxes instead of rows, and a tier holding two surfaces got the same
 *    frame as a tier holding twelve. The surfaces now share a single table
 *    ordered by tier, with the meaning of each tier — and how many surfaces
 *    it holds — in a deliberate secondary column beside it.
 */

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

/** The business name of each surface. An unknown key keeps its key. */
const SURFACE_NAME: Record<string, string> = {
  identity: 'Identité de l’investisseur',
  position: 'Position détenue',
  distributions: 'Distributions versées',
  activity: 'Activité du compte',
  proofs: 'Preuve de réserves',
  allocation: 'Allocation du portefeuille',
  subscription: 'Conditions de souscription',
  alerts: 'Alertes actives',
  capacity: 'Capacité du fonds',
  reserve: 'Réserve de liquidités',
  performance: 'Performance',
  mining: 'Production de la flotte',
  rebalancing: 'Rééquilibrage',
  vault: 'Coffre d’actifs',
  strategies: 'Stratégies actives',
  recentEvents: 'Mouvements récents',
  engine: 'Moteur de minage',
  aiExperts: 'Analyse assistée par IA',
}

const surfaceName = (key: string): string => SURFACE_NAME[key] ?? key

/* ── The three status tiers ──────────────────────────────────────────────── */

type CoverageTier = 'served' | 'partial' | 'notOpened'

const TIER_TITLE: Record<CoverageTier, string> = {
  served: 'Servi',
  partial: 'Partiellement servi',
  notOpened: 'Non ouvert',
}

const TIER_EXPLANATION: Record<CoverageTier, string> = {
  served: 'Ces surfaces renvoient une valeur exploitable. Vous pouvez vous y fier.',
  partial:
    'Ces surfaces répondent, mais sans valeur : le service sait quoi renvoyer, il n’a simplement rien à dire aujourd’hui.',
  notOpened: 'Ces surfaces ne sont pas encore ouvertes. Rien n’en est attendu pour l’instant.',
}

/**
 * Colour here is a claim about state, which is exactly what these three tiers
 * are — so the semantic palette is spent where it means something. An
 * ordinary dataset would get the mint ramp instead.
 */
const TIER_DOT: Record<CoverageTier, string> = {
  served: 'bg-success-500',
  partial: 'bg-warning-500',
  notOpened: 'bg-zinc-500',
}

const TIER_TEXT: Record<CoverageTier, string> = {
  served: 'text-success-400',
  partial: 'text-warning-400',
  notOpened: 'text-zinc-500 dark:text-zinc-400',
}

/** The ranking follows the status declared by the service, without reinterpreting it. */
function tierFromStatus(status: string): CoverageTier {
  if (status === 'LIVE') return 'served'
  if (status === 'PARTIAL' || status === 'STALE' || status === 'SNAPSHOT' || status === 'EMPTY') return 'partial'
  return 'notOpened'
}

const TIER_ORDER: readonly CoverageTier[] = ['served', 'partial', 'notOpened']

type Surface = { readonly key: string; readonly name: string; readonly tier: CoverageTier; readonly reason: string | undefined }
type SourceActivityRow = {
  readonly endpointId: string
  readonly label: string
  readonly status: string
  readonly detail: string | null
}

const countIn = (surfaces: readonly Surface[], tier: CoverageTier): number =>
  surfaces.filter((s) => s.tier === tier).length

const HEAD_CELL = 'px-3 py-2 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-3 py-2 align-top'

export default async function Page() {
  const session = await requireSession()
  const user = publicUser(session)
  const response = await callBackend<Record<string, unknown>>('dashboard')
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })
  const aggregate = response.ok ? response.data : null

  const surfaces =
    aggregate === null
      ? []
      : Object.entries(aggregate)
          .filter((entry): entry is [string, ResolvedField] => isResolvedField(entry[1]))
          .map(([key, resolved]) => ({
            key,
            name: surfaceName(key),
            tier: tierFromStatus(resolved.status),
            reason: motifLisible(resolved.reason),
          }))
  const ordered = TIER_ORDER.flatMap((tier) => surfaces.filter((surface) => surface.tier === tier))

  // VER-01: when the aggregate could not be read, coverage is NOT measurable —
  // it is not "0 served / 0%". Only a readable aggregate yields real counts,
  // and a readable-but-empty aggregate yields an honest zero.
  const coverageUnreadable = unavailable({ endpoint: '/api/v1/admin/dashboard', status: 'UNAVAILABLE', reason: 'dashboard_source_unreachable' })
  const asCount = (n: number): Availability<string> =>
    aggregate === null ? coverageUnreadable : available(String(n), { provenance: 'live', asOf: null })
  const served = countIn(surfaces, 'served')
  const servedCell = asCount(served)
  const partialCell = asCount(countIn(surfaces, 'partial'))
  const notOpenedCell = asCount(countIn(surfaces, 'notOpened'))
  const totalCell = asCount(surfaces.length)
  const coverageCell: Availability<string> =
    aggregate === null || surfaces.length === 0
      ? coverageUnreadable
      : available(`${Math.round((served / surfaces.length) * 100)}%`, { provenance: 'live', asOf: null })

  return (
    <GreenCommandCenterShell
      label="Hearst Connect — poste de pilotage couverture des données"
      rail={<GreenCommandRail currentHref="/admin/dashboard" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Synthèse de la couverture">
        <Panel className={gcc.metricCard}>
          <h2>Servi</h2>
          <div className={gcc.metricText}>
            <Reading value={servedCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Partiel</h2>
          <div className={gcc.metricText}>
            <Reading value={partialCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Non ouvert</h2>
          <div className={gcc.metricText}>
            <Reading value={notOpenedCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Surfaces totales</h2>
          <div className={gcc.metricText}>
            <Reading value={totalCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.metricCard}>
          <h2>Taux de couverture</h2>
          <div className={gcc.metricText}>
            <Reading value={coverageCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>État de la <span>couverture</span></p>
          <p className={gcc.decisionMeta}>{aggregate === null ? 'Source du tableau de bord indisponible' : 'Source du tableau de bord joignable'}</p>
          <p className={gcc.decisionActionMuted}>Champ le plus dégradé d’abord, selon l’état du backend</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Tableau d’état des surfaces">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Surface par surface</h2>
          </div>
          <div className={clsx(gcc.heroBody, 'overflow-x-auto')}>
            {aggregate === null ? (
              <p className={gcc.cellText}>Le point d’accès du tableau de bord n’a pas répondu. Aucune couverture n’est déduite.</p>
            ) : (
              <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
                    <th className={HEAD_CELL}>Surface</th>
                    <th className={HEAD_CELL}>État</th>
                    <th className={HEAD_CELL}>Motif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                  {ordered.map((surface) => (
                    <tr key={surface.key}>
                      <td className={BODY_CELL}>{surface.name}</td>
                      <td className={clsx(BODY_CELL, TIER_TEXT[surface.tier])}>
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', TIER_DOT[surface.tier])} />
                          {TIER_TITLE[surface.tier]}
                        </span>
                      </td>
                      <td className={clsx(BODY_CELL, 'text-zinc-500 dark:text-zinc-400')}>{surface.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          {TIER_ORDER.map((tier) => (
            <Panel key={tier} className={gcc.signalCard}>
              <h3>{TIER_TITLE[tier]}</h3>
              <p className={gcc.signalValue}>{countIn(surfaces, tier)}</p>
              <p className={gcc.cellText}>{TIER_EXPLANATION[tier]}</p>
            </Panel>
          ))}
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Activité des sources">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Activité des sources</h3>
          </div>
          <div className={clsx(gcc.heroBody, 'overflow-x-auto')}>
            <table className="w-full min-w-[680px] table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-950/10 text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
                  <th className={HEAD_CELL}>Source</th>
                  <th className={HEAD_CELL}>État</th>
                  <th className={HEAD_CELL}>Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                {registry.sources.map((source: SourceActivityRow) => (
                  <tr key={source.endpointId}>
                    <td className={BODY_CELL}>{source.label}</td>
                    <td className={clsx(BODY_CELL, 'text-zinc-500 dark:text-zinc-400')}>{source.status.toLowerCase()}</td>
                    <td className={clsx(BODY_CELL, 'text-zinc-500 dark:text-zinc-400')}>{source.detail ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Servi</h3>
            <p className={gcc.cellText}>Surfaces en direct avec une valeur exploitable.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Partiel</h3>
            <p className={gcc.cellText}>Une réponse existe mais la valeur est incomplète.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Non ouvert</h3>
            <p className={gcc.cellText}>Le point d’accès ou la capacité n’est pas encore exposé.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Contrat</h3>
            <p className={gcc.cellText}>Les états sont affichés exactement tels que le backend les rapporte.</p>
          </article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Liens clés</h3>
          <div className={gcc.sourceRow}>
            <Link href="/admin/operations" className="text-sm text-accent-300 underline underline-offset-2">
              Opérations
            </Link>
            <span className={gcc.cellText}>Exécution et mouvements de la chaîne</span>
          </div>
          <div className={gcc.sourceRow}>
            <Link href="/admin/runtime" className="text-sm text-accent-300 underline underline-offset-2">
              Exécution
            </Link>
            <span className={gcc.cellText}>État de l’indexeur et de l’ordonnanceur</span>
          </div>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
