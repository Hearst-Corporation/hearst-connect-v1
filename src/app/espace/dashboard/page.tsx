import { ConsoleShell, gcc } from '@/components/layout/console-shell'
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

export const metadata: Metadata = { title: 'Tableau de bord' }
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
      label="Tableau de bord — Espace Hearst Connect"
      rail={<AppRail currentHref="/espace/dashboard" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Synthèse de la couverture">
        <Panel tone="plain" className={gcc.metricCard}><h2>Servi</h2><div className={gcc.metricText}><Reading value={asCount(served)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Partiel</h2><div className={gcc.metricText}><Reading value={asCount(countIn(surfaces, 'partial'))} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Non ouvert</h2><div className={gcc.metricText}><Reading value={asCount(countIn(surfaces, 'notOpened'))} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Surfaces totales</h2><div className={gcc.metricText}><Reading value={asCount(surfaces.length)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Taux de couverture</h2><div className={gcc.metricText}><Reading value={coverageCell} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>État de la <span>couverture</span></p>
          <p className={gcc.decisionMeta}>{aggregate === null ? 'Source du tableau de bord indisponible' : 'Source du tableau de bord joignable'}</p>
          <p className={gcc.decisionActionMuted}>Champ le plus dégradé d’abord, selon l’état du service</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Tableau d’état des surfaces">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Surface par surface</h2></div>
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
              <p className={gcc.signalValue}>{aggregate === null ? '—' : countIn(surfaces, tier)}</p>
              <p className={gcc.cellText}>{TIER_EXPLANATION[tier]}</p>
            </Panel>
          ))}
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Repères du tableau de bord">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Contrat de couverture</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Les états sont affichés exactement tels que le service les rapporte.</p>
            <p className={gcc.cellText}>Une couverture non lisible n’est jamais présentée comme « 0 % ».</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Servi</h3><p className={gcc.cellText}>Surfaces en direct avec une valeur exploitable.</p></article>
          <article className={gcc.infoCell}><h3>Partiel</h3><p className={gcc.cellText}>Une réponse existe mais la valeur est incomplète.</p></article>
          <article className={gcc.infoCell}><h3>Non ouvert</h3><p className={gcc.cellText}>Le point d’accès n’est pas encore exposé.</p></article>
          <article className={gcc.infoCell}><h3>Contrat</h3><p className={gcc.cellText}>Aucun statut n’est requalifié par cette page.</p></article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Vos sections</h3>
          <div className={gcc.sourceRow}>
            <Link href="/espace/bitcoin" className="text-sm text-accent-300 underline underline-offset-2">Production Bitcoin</Link>
            <span className={gcc.cellText}>Ce que le fonds a produit</span>
          </div>
          <div className={gcc.sourceRow}>
            <Link href="/espace/activite" className="text-sm text-accent-300 underline underline-offset-2">Activité</Link>
            <span className={gcc.cellText}>Le journal des mouvements</span>
          </div>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
