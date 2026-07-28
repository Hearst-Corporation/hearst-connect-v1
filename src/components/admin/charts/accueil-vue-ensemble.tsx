import { CapacityBar } from '@/components/admin/capacity-bar'
import { HeroFigure } from '@/components/admin/cockpit'
import { surfaceRaised } from '@/components/admin/surface'
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
 * Verdicts are never a color alone: each one carries a WORD.
 */

export type TonVerdict = 'neutre' | 'sain' | 'attention' | 'critique'

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

function Verdict({ verdict }: Readonly<{ verdict: VerdictAccueil }>) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{verdict.libelle}</p>
        <span className={clsx('flex shrink-0 items-center gap-1.5 text-[11px] font-medium', TON_TEXTE[verdict.ton])}>
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {verdict.mot}
        </span>
      </div>
      <p className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-950 tabular-nums dark:text-white">
        {verdict.valeur}
      </p>
      {verdict.detail ? (
        <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-400">{verdict.detail}</p>
      ) : null}
    </div>
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
    <section aria-label="Portfolio overview" className={clsx(surfaceRaised, 'overflow-hidden')}>
      <div className="grid grid-cols-1 gap-px bg-zinc-950/5 lg:grid-cols-12 dark:bg-white/5">
        <div className="bg-white px-5 py-6 sm:px-6 lg:col-span-5 dark:bg-zinc-900">
          {/* No unit passed to `HeroFigure`: `montantUsdc` already renders
              the symbol, adding one would produce "$1,177,859 USDC". */}
          <HeroFigure valeur={encours} libelle="Portfolio assets" />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{encoursLegende}</p>
        </div>
        <div className="bg-white px-5 py-6 sm:px-6 lg:col-span-7 dark:bg-zinc-900">
          <p className="mb-3 text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Subscription cap consumed
          </p>
          <CapacityBar utiliseBps={utiliseBps} disponible={disponible} total={plafond} />
        </div>
      </div>

      {verdicts.length > 0 ? (
        <div className="grid grid-cols-1 gap-px border-t border-zinc-950/5 bg-zinc-950/5 sm:grid-cols-2 lg:grid-cols-3 dark:border-white/5 dark:bg-white/5">
          {verdicts.map((v) => (
            <div key={v.id} className="bg-white dark:bg-zinc-900">
              <Verdict verdict={v} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
