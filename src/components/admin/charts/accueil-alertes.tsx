import { surfaceRaised } from '@/components/admin/surface'
import { motifLisible } from '@/lib/mouvements'
import clsx from 'clsx'

/**
 * The service's alerts, rendered.
 *
 * The dashboard's `alerts` field has always been LIVE and was rendered
 * nowhere: an admin console that keeps its alerts to itself misses its
 * primary function. They are therefore placed high, right under the runtime
 * exception banner, before any figure.
 *
 * Two rendering rules:
 *
 * 1. Severity is spelled OUT IN WORDS next to the dot. A reader who can't
 *    tell amber from red reads the same verdict. Same convention as
 *    `GRAVITE` (BTC page) and `TONE_LABEL` (cockpit).
 * 2. The displayed text is translated when the alert code is in the shared
 *    dictionary, and rendered AS-IS otherwise. Guessing a translation for a
 *    message we don't recognize would amount to rewriting what the service
 *    is saying.
 */

export type AlerteBackend = {
  readonly code?: string | null
  readonly severity?: string | null
  readonly message?: string | null
}

type Severity = {
  readonly mot: string
  readonly point: string
  readonly texte: string
  readonly bordure: string
}

const SEVERITY: Record<string, Severity> = {
  critical: { mot: 'Critical', point: 'bg-danger-500', texte: 'text-danger-400', bordure: 'border-danger-500/50' },
  error: { mot: 'Anomaly', point: 'bg-danger-500', texte: 'text-danger-400', bordure: 'border-danger-500/50' },
  warning: { mot: 'Watch closely', point: 'bg-warning-500', texte: 'text-warning-400', bordure: 'border-warning-500/40' },
  warn: { mot: 'Watch closely', point: 'bg-warning-500', texte: 'text-warning-400', bordure: 'border-warning-500/40' },
  info: { mot: 'Informational', point: 'bg-info-500', texte: 'text-info-400', bordure: 'border-info-500/30' },
  notice: { mot: 'Informational', point: 'bg-info-500', texte: 'text-info-400', bordure: 'border-info-500/30' },
}

const UNQUALIFIED: Severity = {
  mot: 'Unqualified',
  point: 'bg-zinc-600',
  texte: 'text-zinc-400',
  bordure: 'border-white/10',
}

function severityInfo(raw: string | null | undefined): Severity {
  if (typeof raw !== 'string' || raw === '') return UNQUALIFIED
  return SEVERITY[raw.toLowerCase()] ?? UNQUALIFIED
}

/** Known alert codes, spelled out. An unknown code keeps its raw message. */
const ALERT_TEXT: Record<string, string> = {
  no_position: 'no active position: nothing has been deployed yet for this account',
}

function alertText(alerte: AlerteBackend): string {
  const code = alerte.code
  if (typeof code === 'string' && code !== '') {
    const local = ALERT_TEXT[code]
    if (local !== undefined) return local
    const shared = motifLisible(code)
    if (shared !== undefined) return shared
  }
  if (typeof alerte.message === 'string' && alerte.message !== '') return alerte.message
  return 'Unlabeled alert reported by the service.'
}

/** An alert with neither code nor message stays identifiable in a list. */
function alertKey(alerte: AlerteBackend, rank: number): string {
  const code = alerte.code
  if (typeof code === 'string' && code !== '') return code
  return `alert-${rank}`
}

export function AccueilAlertes({ alertes }: Readonly<{ alertes: readonly AlerteBackend[] }>) {
  if (alertes.length === 0) return null

  return (
    <section aria-label="Service alerts" className={clsx(surfaceRaised, 'overflow-hidden')}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/5 px-5 py-3 dark:border-white/5">
        <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
          Active alerts
        </h2>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {alertes.length} flagged by the service
        </span>
      </div>
      <ul>
        {alertes.map((a, rank) => {
          const g = severityInfo(a.severity)
          return (
            <li
              key={alertKey(a, rank)}
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
              <p className="min-w-0 flex-1 text-sm text-zinc-700 dark:text-zinc-200">{alertText(a)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
