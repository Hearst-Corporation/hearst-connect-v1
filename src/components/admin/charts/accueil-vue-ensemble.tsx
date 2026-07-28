import { CapacityBar } from '@/components/admin/capacity-bar'
import { HeroFigure } from '@/components/admin/cockpit'
import { AdminGrid, AdminCol, AdminMetricGrid } from '@/components/admin/grid'
import { surfaceRaised } from '@/components/admin/surface'
import { AdminCaption, AdminLabel } from '@/components/admin/typography'
import clsx from 'clsx'

/**
 * "Is everything fine, or not?" — the answer in three seconds.
 *
 * The band gathers the only three things an operator checks before anything
 * else: how much money is committed, how much of the cap is consumed, and
 * whether an operation demands a decision today.
 *
 * Why a capacity BAR and not a second ring: the TVL cap is a linear limit
 * with thresholds (75%, 90%). The eye compares two lengths far better than
 * two arcs, and the bar carries its own written verdict ("Comfortable
 * capacity"). The "Capacity mix" donut that used to occupy this slot said
 * the same number a second time: two representations of the same figure on
 * the same screen isn't useful redundancy, it's noise.
 *
 * ── Composition ───────────────────────────────────────────────────────────
 * ONE card. The previous version drew hairline gutters between its cells and
 * then hung the verdicts in a second bordered strip underneath, so a single
 * surface read as four stacked frames. Now the card holds a real 12-column
 * row — the portfolio figure claims 5 columns, the capacity bar the
 * remaining 7, neither of them "whatever is left" — and the verdicts sit
 * below it as a balanced group separated by one hairline and some space.
 *
 * Verdicts are never a color alone: each one carries a WORD.
 */

export type TonVerdict = 'neutre' | 'sain' | 'attention' | 'critique'

/**
 * Success / warning / danger are spent here deliberately: a verdict is a
 * claim about state, which is exactly what these colors are reserved for.
 * `neutre` stays grey — an unqualified verdict is not an alarm.
 */
const TON_TEXTE: Record<TonVerdict, string> = {
  neutre: 'text-zinc-500 dark:text-zinc-400',
  sain: 'text-success-600 dark:text-success-400',
  attention: 'text-warning-600 dark:text-warning-400',
  critique: 'text-danger-600 dark:text-danger-400',
}

export type VerdictAccueil = {
  readonly id: string
  readonly libelle: string
  readonly valeur: string
  /** The written verdict — it carries the information, not the color. */
  readonly mot: string
  readonly ton: TonVerdict
  readonly detail?: string
}

/**
 * One verdict. No surface of its own: it lives inside the overview card, and
 * a ringed tile inside a ringed card is the frame-in-frame the review
 * rejected. Space and alignment do the grouping.
 */
function Verdict({ verdict }: Readonly<{ verdict: VerdictAccueil }>) {
  return (
    <li className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <AdminLabel className="truncate">{verdict.libelle}</AdminLabel>
        <span
          className={clsx(
            'flex shrink-0 items-center gap-1.5 text-[0.6875rem]/4 font-medium',
            TON_TEXTE[verdict.ton],
          )}
        >
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {verdict.mot}
        </span>
      </div>
      {/* Deliberately a step below the hero figure: this is a supporting
          reading, not the headline number. */}
      <p className="mt-1.5 truncate text-xl/7 font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white">
        {verdict.valeur}
      </p>
      {verdict.detail ? <AdminCaption className="mt-0.5 truncate">{verdict.detail}</AdminCaption> : null}
    </li>
  )
}

export function AccueilVueEnsemble({
  encours,
  encoursLegende,
  utiliseBps,
  disponible,
  plafond,
  verdicts,
}: Readonly<{
  encours: string
  encoursLegende: string
  utiliseBps: number | null
  disponible: string
  plafond: string
  verdicts: readonly VerdictAccueil[]
}>) {
  return (
    <section aria-label="Portfolio overview" className={clsx(surfaceRaised, 'p-6')}>
      <AdminGrid>
        <AdminCol span={5} md={4}>
          {/* No unit passed to `HeroFigure`: `montantUsdc` already renders
              the symbol, adding one would produce "$1,177,859 USDC". */}
          <HeroFigure valeur={encours} libelle="Portfolio assets" />
          <AdminCaption className="mt-2">{encoursLegende}</AdminCaption>
        </AdminCol>
        <AdminCol span={7} md={4}>
          <AdminLabel>Subscription cap consumed</AdminLabel>
          <div className="mt-3">
            <CapacityBar utiliseBps={utiliseBps} disponible={disponible} total={plafond} />
          </div>
        </AdminCol>
      </AdminGrid>

      {verdicts.length > 0 ? (
        <div className="mt-6 border-t border-zinc-950/5 pt-5 dark:border-console-line-soft">
          {/* `AdminMetricGrid` is told how many verdicts there are so the last
              row is never two items stranded on the left of an empty one. */}
          <AdminMetricGrid as="ul" count={verdicts.length}>
            {verdicts.map((v) => (
              <Verdict key={v.id} verdict={v} />
            ))}
          </AdminMetricGrid>
        </div>
      ) : null}
    </section>
  )
}
