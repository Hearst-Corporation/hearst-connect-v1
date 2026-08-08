import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { Panel } from '@/components/compositions'
import { AppRail } from '@/components/layout/app-rail'
import { Reading } from '@/components/layout/console'
import { requireSession } from '@/lib/auth'
import { callBackend, statusFromMeta } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { motifLisible } from '@/lib/mouvements'
import { publicUser } from '@/lib/session'
import { mapAvailability, unavailable } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

/**
 * Tableau de bord — surface USER.
 *
 * Quelles surfaces de votre espace sont réellement servies aujourd'hui. Même
 * endpoint session-tier (`dashboard`) et même contrat que `/admin/dashboard` :
 * on n'affiche pas le JSON brut, et on ne requalifie AUCUN statut — le service
 * calcule l'état champ-le-plus-dégradé-d'abord, on l'explique au lieu de le
 * corriger.
 *
 * Véracité (corrige F-05/VER-01) : quand l'agrégat n'a pas pu être lu, la
 * couverture n'est PAS « 0 servi / 0 % » — c'est une absence nommée. Les comptes
 * ne sont réels que si l'agrégat a répondu, via `mapAvailability` sur une
 * disponibilité dérivée de la réponse.
 */

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

const SURFACE_NAME: Record<string, string> = {
  identity: 'Investor identity',
  position: 'Held position',
  distributions: 'Distributions paid',
  activity: 'Account activity',
  proofs: 'Proof of reserves',
  allocation: 'Portfolio allocation',
  subscription: 'Subscription terms',
  alerts: 'Active alerts',
  capacity: 'Fund capacity',
  reserve: 'Liquidity reserve',
  performance: 'Performance',
  mining: 'Fleet production',
  rebalancing: 'Rebalancing',
  vault: 'Asset vault',
  strategies: 'Active strategies',
  recentEvents: 'Recent movements',
  engine: 'Mining engine',
  aiExperts: 'AI-assisted analysis',
}

const surfaceName = (key: string): string => SURFACE_NAME[key] ?? key

type CoverageTier = 'served' | 'partial' | 'notOpened'

const TIER_TITLE: Record<CoverageTier, string> = {
  served: 'Served',
  partial: 'Partially served',
  notOpened: 'Not opened',
}

const TIER_EXPLANATION: Record<CoverageTier, string> = {
  served: 'These surfaces return a usable value. You can rely on them.',
  partial:
    'These surfaces respond but without a value: the service knows what to return, it simply has nothing to say today.',
  notOpened: 'These surfaces are not open yet. Nothing is expected from them for now.',
}

const TIER_DOT: Record<CoverageTier, string> = {
  served: 'bg-success-500',
  partial: 'bg-warning-500',
  notOpened: 'bg-fg-tertiary',
}

const TIER_TEXT: Record<CoverageTier, string> = {
  served: 'text-success-400',
  partial: 'text-warning-400',
  notOpened: 'text-fg-tertiary dark:text-fg-secondary',
}

function tierFromStatus(status: string): CoverageTier {
  if (status === 'LIVE') return 'served'
  if (status === 'PARTIAL' || status === 'STALE' || status === 'SNAPSHOT' || status === 'EMPTY') return 'partial'
  return 'notOpened'
}

const TIER_ORDER: readonly CoverageTier[] = ['served', 'partial', 'notOpened']

type Surface = { readonly key: string; readonly name: string; readonly tier: CoverageTier; readonly reason: string | undefined }

const countIn = (surfaces: readonly Surface[], tier: CoverageTier): number => surfaces.filter((s) => s.tier === tier).length

const HEAD_CELL = 'px-3 py-2 font-medium whitespace-normal break-words'
const BODY_CELL = 'px-3 py-2 align-top'

export default async function Page() {
  const session = await requireSession()
  const user = publicUser(session)
  const response = await callBackend<Record<string, unknown>>('dashboard')
  const aggregate = response.ok ? response.data : null

  const surfaces: Surface[] =
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

  // Véracité : les comptes n'existent que si l'agrégat a été lu (jamais un 0 forcé).
  const coverageUnreadable = unavailable({
    endpoint: '/api/v1/dashboard',
    status: 'UNAVAILABLE',
    reason: 'dashboard_source_unreachable',
  })
  const dashboardBloc =
    response.ok && aggregate !== null
      ? { status: response.meta?.status ?? 'LIVE', value: aggregate, reason: response.meta?.reason ?? null }
      : null
  const dashboardSource = availabilityFromResolu(dashboardBloc, '/api/v1/dashboard')
  const aggregateAvail = mapAvailability(dashboardSource, () => surfaces)
  const asCount = (n: number) => mapAvailability(aggregateAvail, () => String(n))
  const served = countIn(surfaces, 'served')
  const coverageCell = mapAvailability(aggregateAvail, () =>
    surfaces.length === 0 ? '—' : `${Math.round((served / surfaces.length) * 100)}%`,
  )

  return (
    <ConsoleShell
      label="Dashboard — Hearst Connect Account"
      rail={<AppRail currentHref="/account/dashboard" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Coverage summary">
        <Panel tone="plain" className={csl.metricCard}><h2>Served</h2><div className={csl.metricText}><Reading value={asCount(served)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Partial</h2><div className={csl.metricText}><Reading value={asCount(countIn(surfaces, 'partial'))} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Not opened</h2><div className={csl.metricText}><Reading value={asCount(countIn(surfaces, 'notOpened'))} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Total surfaces</h2><div className={csl.metricText}><Reading value={asCount(surfaces.length)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Coverage rate</h2><div className={csl.metricText}><Reading value={coverageCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Coverage <span>status</span></p>
          <p className={csl.decisionMeta}>{aggregate === null ? 'Dashboard source unavailable' : 'Dashboard source reachable'}</p>
          <p className={csl.decisionActionMuted}>Most degraded field first, per service state</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Surface status table">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Surface by surface</h2></div>
          <div className={clsx(csl.heroBody, 'overflow-x-auto')}>
            {aggregate === null ? (
              <p className={csl.cellText}>The dashboard endpoint did not respond. No coverage is inferred.</p>
            ) : (
              <table className="w-full min-w-[760px] table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-xs text-fg-tertiary dark:border-console-line dark:text-fg-secondary">
                    <th className={HEAD_CELL}>Surface</th>
                    <th className={HEAD_CELL}>Status</th>
                    <th className={HEAD_CELL}>Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-console-line-soft">
                  {ordered.map((surface) => (
                    <tr key={surface.key}>
                      <td className={BODY_CELL}>{surface.name}</td>
                      <td className={clsx(BODY_CELL, TIER_TEXT[surface.tier])}>
                        <span className="inline-flex items-center gap-2">
                          <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', TIER_DOT[surface.tier])} />
                          {TIER_TITLE[surface.tier]}
                        </span>
                      </td>
                      <td className={clsx(BODY_CELL, 'text-fg-tertiary dark:text-fg-secondary')}>{surface.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          {TIER_ORDER.map((tier) => (
            <Panel key={tier} className={csl.signalCard}>
              <h3>{TIER_TITLE[tier]}</h3>
              <p className={csl.signalValue}>{aggregate === null ? '—' : countIn(surfaces, tier)}</p>
              <p className={csl.cellText}>{TIER_EXPLANATION[tier]}</p>
            </Panel>
          ))}
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Dashboard reference points">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Coverage contract</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Statuses are shown exactly as the service reports them.</p>
            <p className={csl.cellText}>Unreadable coverage is never shown as &quot;0%&quot;.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Served</h3><p className={csl.cellText}>Live surfaces with a usable value.</p></article>
          <article className={csl.infoCell}><h3>Partial</h3><p className={csl.cellText}>A response exists but the value is incomplete.</p></article>
          <article className={csl.infoCell}><h3>Not opened</h3><p className={csl.cellText}>The endpoint is not exposed yet.</p></article>
          <article className={csl.infoCell}><h3>Contract</h3><p className={csl.cellText}>No status is requalified by this page.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Your sections</h3>
          <div className={csl.sourceRow}>
            <Link href="/account/bitcoin" className="text-sm text-accent-300 underline underline-offset-2">Bitcoin production</Link>
            <span className={csl.cellText}>What the fund has produced</span>
          </div>
          <div className={csl.sourceRow}>
            <Link href="/account/activity" className="text-sm text-accent-300 underline underline-offset-2">Activity</Link>
            <span className={csl.cellText}>The movement journal</span>
          </div>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
