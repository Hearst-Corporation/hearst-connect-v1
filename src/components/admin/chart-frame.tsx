import clsx from 'clsx'
import { Card, CardHeader } from './cockpit'

/**
 * Cadre commun à tous les graphiques du produit.
 *
 * Un graphique n'est pas une image : c'est une affirmation sur des données. Ce
 * cadre impose donc, pour chacun, ce sans quoi l'affirmation n'est pas
 * vérifiable — la question posée en titre, l'unité, la provenance, et l'état
 * de la donnée au moment du rendu.
 *
 * ── Pourquoi un état vide DESSINÉ, et non un graphique masqué ──────────────
 * Plusieurs surfaces du produit ne sont pas encore alimentées. La tentation
 * serait de ne rien afficher, ou pire, de tracer une série d'exemple. Les deux
 * trompent : la première laisse croire que la vue n'existe pas, la seconde
 * qu'elle est renseignée.
 *
 * Le cadre reste donc visible — titre, unité, axes conceptuels — avec, à la
 * place de la série, une phrase qui dit précisément ce qu'on attend. Le jour
 * où l'endpoint répond, il n'y a rien à redessiner : la série remplace la
 * phrase, et la mise en page ne bouge pas.
 */

export type EtatSerie =
  | { readonly type: 'tracee' }
  | { readonly type: 'vide'; readonly explication: string }
  | { readonly type: 'attendue'; readonly explication: string }
  | { readonly type: 'indisponible'; readonly explication: string }

const TON_ETAT: Record<Exclude<EtatSerie['type'], 'tracee'>, string> = {
  vide: 'text-zinc-400',
  attendue: 'text-zinc-400',
  indisponible: 'text-danger-400',
}

const LIBELLE_ETAT: Record<Exclude<EtatSerie['type'], 'tracee'>, string> = {
  vide: 'Aucune donnée sur la période',
  attendue: 'En attente de la source',
  indisponible: 'Donnée indisponible',
}

export function ChartFrame({
  question,
  unite,
  provenance,
  etat,
  hauteur = 'h-56',
  children,
}: Readonly<{
  question: string
  unite: string
  provenance: string
  etat: EtatSerie
  hauteur?: string
  children?: React.ReactNode
}>) {
  return (
    <Card className="flex flex-col">
      <CardHeader title={question} hint={`${unite} · ${provenance}`} />

      {etat.type === 'tracee' ? (
        children
      ) : (
        <div
          className={clsx(
            hauteur,
            'flex flex-col items-center justify-center gap-2 px-6 text-center',
          )}
        >
          {/* Un axe fantôme : il montre que la vue EXISTE et attend sa série,
              au lieu de laisser un vide qu'on prendrait pour une page cassée. */}
          <div aria-hidden="true" className="mb-1 w-full max-w-sm space-y-3 opacity-40">
            <div className="h-px w-full bg-hairline" />
            <div className="h-px w-full bg-hairline" />
            <div className="h-px w-full bg-hairline" />
          </div>
          <p className={clsx('text-sm font-medium', TON_ETAT[etat.type])}>{LIBELLE_ETAT[etat.type]}</p>
          <p className="max-w-sm text-xs text-zinc-400">{etat.explication}</p>
        </div>
      )}
    </Card>
  )
}
