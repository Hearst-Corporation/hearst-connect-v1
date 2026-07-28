import { surfaceRaised } from '@/components/admin/surface'
import { motifLisible } from '@/lib/mouvements'
import clsx from 'clsx'

/**
 * Les alertes du service, affichées.
 *
 * Le champ `alerts` du dashboard est LIVE depuis toujours et n'était rendu
 * nulle part : une console d'administration qui garde ses alertes pour elle
 * rate sa fonction première. Elles sont donc posées haut, juste sous le
 * bandeau d'exception runtime, avant tout chiffre.
 *
 * Deux règles de rendu :
 *
 * 1. La gravité est écrite EN TOUTES LETTRES à côté de la pastille. Un lecteur
 *    qui ne distingue pas l'ambre du rouge lit le même verdict. C'est la même
 *    convention que `GRAVITE` (page BTC) et `TONE_LABEL` (cockpit).
 * 2. Le texte affiché est traduit quand le code d'alerte figure au dictionnaire
 *    partagé, et rendu TEL QUEL sinon. Traduire au jugé un message qu'on ne
 *    connaît pas reviendrait à réécrire ce que dit le service.
 */

export type AlerteBackend = {
  readonly code?: string | null
  readonly severity?: string | null
  readonly message?: string | null
}

type Gravite = {
  readonly mot: string
  readonly point: string
  readonly texte: string
  readonly bordure: string
}

const GRAVITE: Record<string, Gravite> = {
  critical: { mot: 'Critique', point: 'bg-danger-500', texte: 'text-danger-400', bordure: 'border-danger-500/50' },
  error: { mot: 'Anomalie', point: 'bg-danger-500', texte: 'text-danger-400', bordure: 'border-danger-500/50' },
  warning: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400', bordure: 'border-warning-500/40' },
  warn: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400', bordure: 'border-warning-500/40' },
  info: { mot: 'Pour information', point: 'bg-info-500', texte: 'text-info-400', bordure: 'border-info-500/30' },
  notice: { mot: 'Pour information', point: 'bg-info-500', texte: 'text-info-400', bordure: 'border-info-500/30' },
}

const NON_QUALIFIEE: Gravite = {
  mot: 'Non qualifiée',
  point: 'bg-zinc-600',
  texte: 'text-zinc-400',
  bordure: 'border-white/10',
}

function graviteLisible(brut: string | null | undefined): Gravite {
  if (typeof brut !== 'string' || brut === '') return NON_QUALIFIEE
  return GRAVITE[brut.toLowerCase()] ?? NON_QUALIFIEE
}

/** Codes d'alerte connus, dits en français. Un code inconnu garde son message. */
const TEXTE_ALERTE: Record<string, string> = {
  no_position: 'aucune position active : rien n’est encore déployé pour ce compte',
}

function texteAlerte(alerte: AlerteBackend): string {
  const code = alerte.code
  if (typeof code === 'string' && code !== '') {
    const local = TEXTE_ALERTE[code]
    if (local !== undefined) return local
    const partage = motifLisible(code)
    if (partage !== undefined) return partage
  }
  if (typeof alerte.message === 'string' && alerte.message !== '') return alerte.message
  return 'Alerte sans intitulé transmise par le service.'
}

/** Une alerte sans code ni message reste identifiable dans une liste. */
function cleAlerte(alerte: AlerteBackend, rang: number): string {
  const code = alerte.code
  if (typeof code === 'string' && code !== '') return code
  return `alerte-${rang}`
}

export function AccueilAlertes({ alertes }: Readonly<{ alertes: readonly AlerteBackend[] }>) {
  if (alertes.length === 0) return null

  return (
    <section aria-label="Alertes du service" className={clsx(surfaceRaised, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/5 px-5 py-3 dark:border-white/5">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
          Alertes en cours
        </h2>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {alertes.length} relevée{alertes.length > 1 ? 's' : ''} par le service
        </span>
      </div>
      <ul>
        {alertes.map((a, rang) => {
          const g = graviteLisible(a.severity)
          return (
            <li
              key={cleAlerte(a, rang)}
              className={clsx(
                'flex flex-col gap-1.5 border-b border-l-2 px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4',
                'border-b-zinc-950/5 dark:border-b-white/5',
                g.bordure,
              )}
            >
              <span className={clsx('flex shrink-0 items-center gap-2 text-xs font-semibold sm:w-40', g.texte)}>
                <span aria-hidden="true" className={clsx('size-2 shrink-0 rounded-full', g.point)} />
                {g.mot}
              </span>
              <p className="min-w-0 flex-1 text-sm text-zinc-700 dark:text-zinc-200">{texteAlerte(a)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
