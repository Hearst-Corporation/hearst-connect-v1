import { CapacityBar } from '@/components/admin/capacity-bar'
import { HeroFigure } from '@/components/admin/cockpit'
import { surfaceRaised } from '@/components/admin/surface'
import clsx from 'clsx'

/**
 * « Tout va bien, ou pas ? » — la réponse en trois secondes.
 *
 * Le bandeau réunit les trois seules choses qu'un responsable regarde avant
 * toute autre : combien d'argent est engagé, quelle part du plafond est
 * consommée, et si une opération demande une décision aujourd'hui.
 *
 * Pourquoi une BARRE de capacité et non un second anneau : le plafond TVL est
 * une limite linéaire avec des seuils (75 %, 90 %). L'œil compare deux
 * longueurs bien mieux que deux arcs, et la barre porte son propre verdict
 * écrit (« Capacité confortable »). Le donut « Mix capacité » qui occupait
 * cette place disait le même nombre une seconde fois : deux représentations du
 * même chiffre dans le même écran ne sont pas de la redondance utile, c'est du
 * bruit.
 *
 * Les verdicts ne sont jamais une couleur seule : chacun porte un MOT.
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
  /** Le verdict écrit — c'est lui qui porte l'information, pas la teinte. */
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
    <section aria-label="Vue d’ensemble du portefeuille" className={clsx(surfaceRaised, 'overflow-hidden')}>
      <div className="grid grid-cols-1 gap-px bg-zinc-950/5 lg:grid-cols-12 dark:bg-white/5">
        <div className="bg-white px-5 py-6 sm:px-6 lg:col-span-5 dark:bg-zinc-900">
          {/* Pas d'unité passée à `HeroFigure` : `montantUsdc` rend déjà le
              symbole, l'ajouter donnerait « 1 177 859 $ USDC ». */}
          <HeroFigure valeur={encours} libelle="Encours du portefeuille" />
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{encoursLegende}</p>
        </div>
        <div className="bg-white px-5 py-6 sm:px-6 lg:col-span-7 dark:bg-zinc-900">
          <p className="mb-3 text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            Plafond de souscription consommé
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
