import clsx from 'clsx'

/**
 * « Quelle part du plafond est déjà engagée ? »
 *
 * Une barre horizontale plutôt qu'une jauge circulaire : le plafond est une
 * limite linéaire, et l'œil compare mieux deux longueurs que deux arcs. Le
 * chiffre est écrit à côté — la barre l'illustre, elle ne le remplace pas.
 *
 * Le seuil colore le remplissage : sous 75 % on est à l'aise, au-delà de 90 %
 * la capacité restante devient un sujet. Le libellé le dit aussi, pour qui ne
 * distingue pas les teintes.
 */

export function CapacityBar({
  utiliseBps,
  disponible,
  total,
}: Readonly<{ utiliseBps: number | null; disponible: string; total: string }>) {
  if (utiliseBps === null || !Number.isFinite(utiliseBps)) {
    return (
      <p className="text-sm text-zinc-500">
        Le taux de remplissage n’a pas pu être lu. Aucune barre n’est tracée plutôt qu’une barre à zéro.
      </p>
    )
  }

  const pourcent = utiliseBps / 100
  const largeur = Math.min(100, Math.max(0, pourcent))
  const tendu = pourcent >= 90
  const soutenu = pourcent >= 75 && pourcent < 90

  let texteTon = 'text-success-400'
  let messageTon = 'Capacité confortable'
  let barreTon = 'bg-accent-400'
  if (tendu) {
    texteTon = 'text-danger-400'
    messageTon = 'Capacité presque atteinte'
    barreTon = 'bg-danger-500'
  } else if (soutenu) {
    texteTon = 'text-warning-400'
    messageTon = 'Remplissage soutenu'
    barreTon = 'bg-warning-500'
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-2xl font-semibold text-white tabular-nums">
          {pourcent.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %
        </p>
        <p className={clsx('text-xs font-medium', texteTon)}>{messageTon}</p>
      </div>

      <div
        role="img"
        aria-label={`Plafond utilisé à ${pourcent.toFixed(2)} pour cent`}
        className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-sunken"
      >
        <div className={clsx('h-full rounded-full', barreTon)} style={{ width: `${largeur}%` }} />
      </div>

      <dl className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-zinc-500">Encore disponible</dt>
          <dd className="text-zinc-300 tabular-nums">{disponible}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-zinc-500">Plafond</dt>
          <dd className="text-zinc-300 tabular-nums">{total}</dd>
        </div>
      </dl>
    </div>
  )
}
