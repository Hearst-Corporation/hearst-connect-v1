import { AllocationChart, ChartFrame, VendingCurveChart, type EtatSerie, type PocheAllocation, type PointCourbe } from '@/components/charts'
import { MetricValue, Panel, PanelHeader, SideFact, SourceAttendue } from '@/components/compositions'
import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import { publicUser } from '@/lib/session'
import { available, editorial, unavailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fiche produit' }
export const dynamic = 'force-dynamic'

/**
 * Product Sheet — what a subscriber commits to.
 *
 * The old page dumped a route's raw response. A product sheet isn't a
 * technical object, though — it's a contract. Three questions summarize
 * it: how much must be deposited and for how long, how the reward rate
 * evolves over the months, and where the money is meant to be placed.
 *
 * ── Composition ───────────────────────────────────────────────────────────
 * Two sections, two rows, and no block that stretches to whatever is left.
 *
 *   Subscription terms   terms card (5 cols) · reward-rate frame (7 cols)
 *   Target allocation    allocation bars (6) · per-pocket detail (6)
 *
 * The rejected version stacked four full-width surfaces, so a page carrying
 * one amount, two facts and a handful of rows ran past two viewports. Pairing
 * each headline with its detail on the same row is what shortens it, not
 * shrinking anything.
 *
 * ── The flat-curve trap ─────────────────────────────────────────────────
 * The service does return five real milestones, but every rate on this
 * deployment is zero. Plotting that line would be a misleading read: it
 * would say "zero reward measured" when the truth is "not configured yet".
 * The `curveConfigured` flag makes the distinction, and the frame then
 * shows what's expected instead of a flat curve.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Pocket = {
  readonly pocket?: string | null
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
}

type Terms = {
  readonly productDurationMonths?: number | null
  readonly minimumDepositUsdc?: string | null
  readonly allocation?: { readonly pockets?: readonly Pocket[] | null } | null
}

type Factsheet = {
  readonly terms?: Resolved<Terms>
  readonly tvlCap?: Resolved<string | number>
  readonly vendingCurve?: Resolved<readonly { month: number; bps: number }[]>
}

const PAGE_REASONS = {
  ...MOTIF_SERIE,
  dynavault_not_deployed: 'ces conditions ne sont pas encore disponibles sur le contrat déployé',
}

function stateOf(block: Resolved<unknown> | undefined, fallback: string): EtatSerie {
  return etatSerieDe(block, fallback, PAGE_REASONS)
}

/**
 * A duration of zero months isn't a duration: it's a term not yet set. The
 * product then closes on no milestone at all — that has to be said, rather
 * than displaying "0 months".
 */
function readableDuration(months: number | null | undefined): string {
  if (months === null || months === undefined || !Number.isFinite(months)) return '—'
  if (months <= 0) return 'Aucune durée fixe'
  return `${formatNumber(months)} mois`
}

/**
 * A variance reads signed, and its color is a claim.
 *
 * The previous version painted every pocket within a point of its target in
 * success green and everything past five points in warning orange, which
 * turned an ordinary allocation table into a traffic light. Green and orange
 * are the only two colors this console has left to say "healthy" and "worth
 * watching"; spending them on a routine reading leaves nothing to say with
 * when a pocket is genuinely off. So an ordinary variance is neutral, and the
 * semantic tone appears only for a drift material enough to act on.
 */
const DRIFT_THRESHOLD_POINTS = 5

function readableVariance(target: number | null, actual: number | null): { text: string; tone: string } {
  if (target === null || actual === null) return { text: '—', tone: 'text-zinc-500' }
  const pts = (actual - target) / 100
  const tone = Math.abs(pts) >= DRIFT_THRESHOLD_POINTS ? 'text-warning-400' : 'text-zinc-300'
  return { text: `${formatNumber(pts, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`, tone }
}

function readableShare(bps: number | null | undefined): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
}

function curveState(points: readonly PointCourbe[], curveConfigured: boolean, vendingCurve: Resolved<unknown> | undefined): EtatSerie {
  if (points.length === 0) {
    return stateOf(vendingCurve, 'Les conditions de rémunération n’ont pas encore été transmises.')
  }
  if (curveConfigured) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Les cinq jalons du produit sont définis, mais aucun taux n’a encore été enregistré pour l’un d’eux. La courbe s’affichera dès qu’ils le seront.',
  }
}

export default async function Page() {
  const [session, response] = await Promise.all([requireSession(), callBackend<Factsheet>('product-factsheet')])
  const user = publicUser(session)
  const f = response.ok ? response.data : null

  const terms = f?.terms?.value
  const cap = f?.tvlCap?.value

  // Target allocation by pocket. A pocket without a readable target is
  // dropped rather than rounded down to zero.
  const rawPockets = terms?.allocation?.pockets
  const pockets = rawPockets ?? []
  const readablePockets = pockets.filter((p) => p.targetBps !== null && p.targetBps !== undefined && Number.isFinite(p.targetBps))

  const allocation: PocheAllocation[] = readablePockets.map((p) => ({
    poche:
      p.label === null || p.label === undefined || p.label === ''
        ? (p.pocket ?? 'Poche sans nom')
        : p.label,
    cible: Number(p.targetBps) / 100,
    reel:
      p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
        ? null
        : p.actualBps / 100,
  }))

  // Reward curve. Five real milestones, every rate at zero: the curve
  // isn't configured. Plotting a flat line would read as "zero reward
  // measured", which would be false.
  const rawCurve = f?.vendingCurve?.value
  const points: PointCourbe[] =
    rawCurve === null || rawCurve === undefined
      ? []
      : rawCurve.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const curveConfigured = points.some((p) => p.taux !== 0)

  const hasPocketDetail = readablePockets.length > 0

  // VER-03: these counts are only measurements when their source was read.
  // When the factsheet call failed, or the allocation / curve is absent, the
  // count is unavailable — never a bare "0" that reads as "zero measured".
  const factsheetUnreadable = unavailable({
    endpoint: '/api/v1/product/factsheet',
    status: 'UNAVAILABLE',
    reason: 'product_factsheet_unreachable',
  })
  const pocketsCell: Availability<string> =
    !response.ok || rawPockets === null || rawPockets === undefined
      ? (response.ok
          ? unavailable({ endpoint: '/api/v1/product/factsheet', status: 'PARTIAL', reason: 'allocation_absent' })
          : factsheetUnreadable)
      : available(String(readablePockets.length), { provenance: 'live', asOf: null })
  const curveCell: Availability<string> =
    !response.ok || rawCurve === null || rawCurve === undefined
      ? (response.ok
          ? unavailable({ endpoint: '/api/v1/product/factsheet', status: 'PARTIAL', reason: 'vending_curve_absent' })
          : factsheetUnreadable)
      : available(String(points.length), { provenance: 'live', asOf: null })
  // Single figures: present only when the factsheet was read. Editorial (not a
  // live-badged measurement) since they are formatted contract terms.
  const figure = (value: string): Availability<string> => (response.ok ? editorial(value) : factsheetUnreadable)

  return (
    <ConsoleShell
      label="Hearst Connect — poste de pilotage produit"
      rail={<ConsoleRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Synthèse du produit">
        <Panel tone="plain" className={gcc.metricCard}>
          <h2>Dépôt minimum</h2>
          <div className={gcc.metricText}>
            <Reading value={figure(formatCurrency(terms?.minimumDepositUsdc, { decimals: 0 }))} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel tone="plain" className={gcc.metricCard}>
          <h2>Durée</h2>
          <div className={gcc.metricText}>
            <Reading value={figure(readableDuration(terms?.productDurationMonths))} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel tone="plain" className={gcc.metricCard}>
          <h2>Plafond du fonds</h2>
          <div className={gcc.metricText}>
            <Reading value={figure(formatCurrency(cap, { decimals: 0 }))} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel tone="plain" className={gcc.metricCard}>
          <h2>Poches</h2>
          <div className={gcc.metricText}>
            <Reading value={pocketsCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel tone="plain" className={gcc.metricCard}>
          <h2>Jalons de courbe</h2>
          <div className={gcc.metricText}>
            <Reading value={curveCell} className={gcc.metricValue} />
          </div>
        </Panel>
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Fiche <span>produit</span></p>
          <p className={gcc.decisionMeta}>{curveConfigured ? 'Courbe de rémunération configurée' : 'Courbe de rémunération en attente'}</p>
          <p className={gcc.decisionActionMuted}>Aucune condition synthétique</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Détails du produit">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}>
            <h2 className={gcc.cardTitle}>Fiche produit</h2>
          </div>
          <div className={gcc.heroBody}>

      {f === null ? (
        // One stated absence, at the measure a sentence reads best — not a
        // 1280px band holding a single line.
        <AdminGrid>
          <AdminCol span={7} md={6}>
            <SourceAttendue
              quoi="La fiche produit n’a pas pu être lue"
              detail="Le service n’a pas répondu. Aucune condition n’est affichée plutôt que d’en montrer d’obsolètes."
              requis={['Une réponse du service']}
            />
          </AdminCol>
        </AdminGrid>
      ) : (
        <>
          {/* ── Subscription terms ──────────────────────────────────────────
              The amount and the rate that pays it are one subject, so they
              share a row instead of stacking into two full-width bands. */}
          <AdminSection title="Conditions de souscription">
            <AdminGrid>
              <AdminCol span={5} md={4}>
                <Panel tone="plain" className="p-6">
                  {/*
                    The deposit is the primary item; the duration and the cap
                    are the two facts that qualify it, stacked beside it at
                    their natural width.

                    The rejected version gave that pair `flex-1` inside a
                    `justify-between` row, so the two small facts were pushed
                    against the far edge of a full-width card and the gap in
                    the middle grew with the viewport. Nothing declares a
                    stretch here: the supporting facts sit next to the amount
                    and stop where their text stops.
                  */}
                  <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
                    <MetricValue
                      valeur={formatCurrency(terms?.minimumDepositUsdc, { decimals: 0 })}
                      libelle="Dépôt minimum pour souscrire"
                    />
                    <div className="grid min-w-0 gap-y-3">
                      <SideFact libelle="Durée du produit" valeur={readableDuration(terms?.productDurationMonths)} />
                      <SideFact libelle="Plafond du fonds" valeur={formatCurrency(cap, { decimals: 0 })} />
                    </div>
                  </div>
                </Panel>
              </AdminCol>

              <AdminCol span={7} md={4}>
                <ChartFrame
                  question="Comment le taux de rémunération évolue-t-il sur la durée du produit ?"
                  unite="en pourcentage, par mois"
                  etat={curveState(points, curveConfigured, f.vendingCurve)}
                >
                  <VendingCurveChart points={points} />
                </ChartFrame>
              </AdminCol>
            </AdminGrid>
          </AdminSection>

          {/* ── Target allocation ───────────────────────────────────────────
              The bars answer the question; the table is the detail behind
              them, including the pockets whose on-chain balance could not be
              read at all and which therefore have no bar. Side by side, one
              row instead of two. When there is no detail to show, the frame
              takes the full twelve columns rather than leaving half a row
              stranded. */}
          <AdminSection title="Allocation cible">
            <AdminGrid>
              <AdminCol span={hasPocketDetail ? 6 : 12}>
                <ChartFrame
                  question="L’argent est-il placé là où il devrait l’être ?"
                  unite="en pourcentage du portefeuille"
                  etat={
                    allocation.length > 0
                      ? { type: 'tracee' }
                      : stateOf(f.terms, 'Aucune allocation cible n’a encore été enregistrée dans les conditions du produit.')
                  }
                >
                  <AllocationChart poches={allocation} />
                </ChartFrame>
              </AdminCol>

              {hasPocketDetail ? (
                <AdminCol span={6}>
                  <Panel>
                    <PanelHeader
                      title="Quelle part détient chaque poche ?"
                      hint="Ciblée par le contrat, constatée on-chain, et l’écart entre les deux"
                    />
                    <div className="overflow-x-hidden">
                      <table className="w-full table-fixed text-sm">
                        <thead>
                          <tr className="border-b border-zinc-950/10 text-left text-xs text-zinc-500 dark:border-console-line dark:text-zinc-400">
                            <th scope="col" className="px-4 py-2.5 font-medium">
                              Poche
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Cible
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Constaté
                            </th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium">
                              Écart
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                          {readablePockets.map((p, index) => {
                            const target = Number(p.targetBps)
                            const actual =
                              p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
                                ? null
                                : p.actualBps
                            const variance = readableVariance(target, actual)
                            return (
                              <tr key={p.pocket ?? p.label ?? String(index)}>
                                <th scope="row" className="px-4 py-2.5 text-left font-normal text-zinc-200">
                                  {p.label === null || p.label === undefined || p.label === ''
                                    ? (p.pocket ?? 'Poche sans nom')
                                    : p.label}
                                </th>
                                <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{readableShare(target)}</td>
                                <td className="px-4 py-2.5 text-right text-zinc-200 tabular-nums">{readableShare(actual)}</td>
                                <td className={clsx('px-4 py-2.5 text-right tabular-nums', variance.tone)}>{variance.text}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </AdminCol>
              ) : null}
            </AdminGrid>
          </AdminSection>
        </>
      )}
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Couverture</h3>
            <p className={gcc.cellText}>{f === null ? 'Fiche produit indisponible' : 'Fiche produit disponible'}</p>
          </Panel>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Source d’allocation</h3>
            <p className={gcc.cellText}>{hasPocketDetail ? 'Poches lisibles' : 'Aucune poche lisible'}</p>
          </Panel>
          <Panel tone="plain" className={gcc.signalCard}>
            <h3>Courbe de rémunération</h3>
            <p className={gcc.cellText}>{curveConfigured ? 'Configurée' : 'Non configurée'}</p>
          </Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes du produit">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}>
            <h3 className={gcc.cardTitle}>Garde-fous</h3>
          </div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Aucune rémunération interpolée lorsque tous les jalons sont à zéro.</p>
            <p className={gcc.cellText}>Aucune allocation cible synthétique lorsque les poches sont illisibles.</p>
            <p className={gcc.cellText}>Toute absence reste explicite et sourcée.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}>
            <h3>Point d’accès des conditions</h3>
            <p className={gcc.cellText}>`product-factsheet`</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Vue d’allocation</h3>
            <p className={gcc.cellText}>Cible vs constaté par poche.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Vue de la courbe</h3>
            <p className={gcc.cellText}>Jalons du taux de rémunération mensuel.</p>
          </article>
          <article className={gcc.infoCell}>
            <h3>Seuil</h3>
            <p className={gcc.cellText}>Aucun taux fictif lorsque la source n’est pas configurée.</p>
          </article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>État</h3>
          <p className={gcc.cellText}>{f === null ? 'Source de la fiche produit indisponible.' : 'Source de la fiche produit joignable.'}</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
