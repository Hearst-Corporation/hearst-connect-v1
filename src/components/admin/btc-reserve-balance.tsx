import { CircleStackIcon } from '@heroicons/react/16/solid'

/**
 * Bilan de la réserve bitcoin — produit, retenu, vendu.
 *
 * La question que l'écran pose à chaque consultation : sur tout le BTC que
 * l'infrastructure a miné, combien reste-t-il au bilan ? Aujourd'hui la réponse
 * est zéro, et c'est précisément le fait à rendre visible : le produit est vendu
 * comme une réserve stratégique, mais rien ne s'accumule.
 *
 * Le zéro est AFFIRMÉ, pas déduit d'une absence de donnée. Tant qu'aucun
 * endpoint ne publie de solde de réserve, la retenue vaut zéro par construction
 * — c'est une lecture du système tel qu'il est, pas un trou de source. Quand une
 * réserve existera côté backend, `retainedSats` prendra sa valeur lue et le bloc
 * tient sans changer de forme.
 *
 * L'électricité qualifie la marge de manœuvre : la part du BTC produit que les
 * coûts opérationnels consomment borne ce qu'il est possible de retenir.
 */

const SATS_PER_BTC = 100_000_000

const btcFrom = (sats: number) => sats / SATS_PER_BTC

/** 4 décimales : assez fin pour la production mensuelle, lisible en tableau. */
const btcText = (sats: number) => btcFrom(sats).toFixed(4)

export type ReserveBalance = {
  /** Sats cumulés produits par le minage — lu sur `btc.btcProduced.totalSats`. */
  readonly producedSats: number
  /** Sats conservés au bilan. Zéro tant qu'aucune réserve n'existe. */
  readonly retainedSats: number
  /** Valeur en dollars du BTC produit, au spot, quand le cours est lisible. */
  readonly producedUsd: number | null
  /** Coûts électricité cumulés, en dollars entiers, quand ils sont lisibles. */
  readonly electricityUsd: number | null
}

export function BtcReserveBalance({ balance }: Readonly<{ balance: ReserveBalance | null }>) {
  if (balance === null) {
    return (
      <p className="text-sm text-fg-tertiary">
        BTC production could not be read — nothing is shown rather than a guess.
      </p>
    )
  }

  const { producedSats, retainedSats, producedUsd, electricityUsd } = balance
  const soldSats = Math.max(producedSats - retainedSats, 0)
  const retainedPct = producedSats > 0 ? (retainedSats / producedSats) * 100 : 0

  // Part du BTC produit absorbée par l'électricité — la borne haute de ce qui
  // pourrait être retenu si le minage doit financer ses propres coûts.
  const electricityPct =
    producedUsd !== null && electricityUsd !== null && producedUsd > 0
      ? (electricityUsd / producedUsd) * 100
      : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* La barre porte le constat : une piste presque entièrement « vendue ». */}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-console-inset ring-1 ring-console-line-soft">
          <div
            className="h-full bg-accent-400"
            style={{ width: `${retainedPct}%` }}
            aria-hidden="true"
          />
          <div className="h-full flex-1 bg-fg-tertiary/25" aria-hidden="true" />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-accent-400" aria-hidden="true" />
            Retained {retainedPct.toFixed(0)} %
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-fg-tertiary/40" aria-hidden="true" />
            Sold {(100 - retainedPct).toFixed(0)} %
          </span>
        </div>
      </div>

      <dl className="divide-y divide-console-line-soft">
        <ReserveRow label="BTC produced (cumulative)" value={`${btcText(producedSats)} BTC`} />
        <ReserveRow label="Sold for USDC accounting" value={`${btcText(soldSats)} BTC`} />
        <ReserveRow
          label="Held in reserve"
          value={`${btcText(retainedSats)} BTC`}
          tone={retainedSats === 0 ? 'flagged' : 'normal'}
        />
        {electricityPct !== null ? (
          <ReserveRow
            label="Electricity as share of production"
            value={`${electricityPct.toFixed(1)} %`}
          />
        ) : null}
      </dl>

      {retainedSats === 0 ? (
        <div className="flex gap-2.5 rounded-lg border border-l-4 border-console-line-soft border-l-warning-400/70 bg-warning-400/[0.04] px-3.5 py-3">
          <CircleStackIcon className="mt-0.5 size-4 shrink-0 text-warning-400" aria-hidden="true" />
          <p className="text-sm text-fg-secondary">
            <span className="font-semibold text-fg">No bitcoin is being retained.</span> Every
            satoshi mined is sold to keep the book in dollars. The product is sold as a strategic
            reserve — this row is the one that would show it accumulating.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ReserveRow({
  label,
  value,
  tone = 'normal',
}: Readonly<{ label: string; value: string; tone?: 'normal' | 'flagged' }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-3">
      <dt className="min-w-0 text-xs font-medium text-fg-tertiary">{label}</dt>
      <dd
        className={`shrink-0 text-sm font-semibold tabular-nums ${
          tone === 'flagged' ? 'text-warning-400' : 'text-fg'
        }`}
      >
        {value}
      </dd>
    </div>
  )
}
