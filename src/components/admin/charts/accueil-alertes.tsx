import { surfaceRaised } from '@/components/admin/surface'
import { AdminCaption, AdminSurfaceTitle } from '@/components/admin/typography'
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
 *
 * ── Size ──────────────────────────────────────────────────────────────────
 * The card is proportional to what it holds. Two informational alerts used
 * to occupy a full-width band with a bordered uppercase header and a colored
 * rule down the side of every row — three framing devices around two lines
 * of text, which read as an incident when nothing was wrong. Severity is now
 * carried entirely by the dot and the word beside it, so the card is exactly
 * as tall as its sentences.
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
}

/**
 * Danger / warning are semantic colors and are spent only where the service
 * genuinely reports that state.
 *
 * `info` and `notice` are NEUTRAL, not blue. The console's palette has three
 * semantic tones — positive, warning, critical — and a fourth hue for "nothing
 * to do about this" made informational alerts compete for attention with the
 * ones that need a decision. Grey says "read it, then move on" better than
 * blue does, and it keeps the page down to one accent plus the tones that
 * genuinely mean something. An unqualified severity stays grey too: an alert
 * we can't rank does not get promoted to an alarm by the UI.
 */
const SEVERITY: Record<string, Severity> = {
  critical: { mot: 'Critical', point: 'bg-danger-500', texte: 'text-danger-600 dark:text-danger-400' },
  error: { mot: 'Anomaly', point: 'bg-danger-500', texte: 'text-danger-600 dark:text-danger-400' },
  warning: { mot: 'Watch closely', point: 'bg-warning-500', texte: 'text-warning-600 dark:text-warning-400' },
  warn: { mot: 'Watch closely', point: 'bg-warning-500', texte: 'text-warning-600 dark:text-warning-400' },
  info: { mot: 'Informational', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
  notice: { mot: 'Informational', point: 'bg-zinc-400 dark:bg-zinc-500', texte: 'text-zinc-600 dark:text-zinc-300' },
}

const UNQUALIFIED: Severity = {
  mot: 'Unqualified',
  point: 'bg-zinc-400 dark:bg-zinc-600',
  texte: 'text-zinc-500 dark:text-zinc-400',
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
    <section aria-label="Service alerts" className={clsx(surfaceRaised, 'p-5')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <AdminSurfaceTitle>Active alerts</AdminSurfaceTitle>
        <AdminCaption className="tabular-nums">{alertes.length} flagged by the service</AdminCaption>
      </div>
      <ul className="mt-3 space-y-2">
        {alertes.map((a, rank) => {
          const g = severityInfo(a.severity)
          return (
            <li
              key={alertKey(a, rank)}
              className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4"
            >
              <span className={clsx('flex shrink-0 items-center gap-2 text-xs font-semibold sm:w-36', g.texte)}>
                <span aria-hidden="true" className={clsx('size-1.5 shrink-0 rounded-full', g.point)} />
                {g.mot}
              </span>
              <p className="min-w-0 flex-1 text-sm/6 text-zinc-700 dark:text-zinc-200">{alertText(a)}</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
