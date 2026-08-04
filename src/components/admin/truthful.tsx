import { formatDateTime, formatNumber } from '@/lib/format'
import type { CallTrace, EnvelopeMeta, KeeperActionResult, Problem } from '@/lib/backend/client'
import type { Resolved, ResolvedStatus } from '@/lib/resolved'
import clsx from 'clsx'

/**
 * Truthful-rendering components for the admin console.
 *
 * One rule: what renders comes from the backend, or carries a named state.
 * None of these components fabricate a value, round an absence to zero, or
 * requalify a status. `SIMULATED` only exists if the backend said so.
 */

/* ── Status badge ────────────────────────────────────────────────────────── */

type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral'

const STATUS_TONE: Record<ResolvedStatus | 'SNAPSHOT', BadgeTone> = {
  LIVE: 'ok',
  SNAPSHOT: 'info',
  STALE: 'warn',
  PARTIAL: 'warn',
  EMPTY: 'neutral',
  SIMULATED: 'warn',
  NOT_CONFIGURED: 'warn',
  UNAVAILABLE: 'bad',
  NOT_SUPPORTED: 'neutral',
  PERMISSION_DENIED: 'bad',
  ERROR: 'bad',
}

// Présentation FR des statuts (glossaire). Le statut TECHNIQUE (clé) est
// inchangé : seule la présentation utilisateur est traduite.
const STATUS_LABEL: Record<ResolvedStatus | 'SNAPSHOT', string> = {
  LIVE: 'En direct',
  SNAPSHOT: 'Instantané',
  STALE: 'Données obsolètes',
  PARTIAL: 'Partiel',
  EMPTY: 'Aucune donnée',
  SIMULATED: 'Simulé (backend)',
  NOT_CONFIGURED: 'Non configuré',
  UNAVAILABLE: 'Indisponible',
  NOT_SUPPORTED: 'Non pris en charge',
  PERMISSION_DENIED: 'Accès refusé',
  ERROR: 'Erreur',
}

/**
 * Four tones, and only one of them is a hue you have to act on.
 *
 * `info` used to be blue. The approved system has no blue in it — the console
 * is neutral graphite plus the brand mint plus three semantic tones, and a
 * badge that means "this is fine, just so you know" has no business carrying
 * a fourth hue. It reads as graphite now, exactly like `neutral`, because
 * that is what it means.
 */
const TONE_CLASS: Record<BadgeTone, string> = {
  ok: 'bg-success-400/15 text-success-400 ring-success-400/30',
  warn: 'bg-warning-400/15 text-warning-400 ring-warning-400/30',
  bad: 'bg-danger-400/20 text-danger-400 ring-danger-400/40',
  info: 'bg-white/5 text-zinc-300 ring-console-line-strong',
  neutral: 'bg-white/5 text-zinc-400 ring-console-line-strong',
}

export function StatusBadge({
  status,
  className,
}: Readonly<{ status: ResolvedStatus | 'SNAPSHOT'; className?: string }>) {
  return (
    <span
      className={clsx(
        className,
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONE_CLASS[STATUS_TONE[status]],
      )}
    >
      {/* The dot isn't the only marker: the label carries the information. */}
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

/* ── Provenance and freshness ────────────────────────────────────────────── */

const PROVENANCE_LABEL: Record<string, string> = {
  live: 'Source en direct',
  db: 'Base de données',
  indexed: 'Indexé',
  manual: 'Source manuelle',
  fixture: 'Fixture backend — pas une source réelle',
}

export function DataProvenance({
  provenance,
  source,
  className,
}: Readonly<{ provenance?: string | null; source?: string | null; className?: string }>) {
  if (!provenance && !source) return null
  const label = provenance ? (PROVENANCE_LABEL[provenance] ?? provenance) : null
  const conspicuous = provenance === 'fixture' || provenance === 'manual'

  return (
    <span
      className={clsx(
        className,
        'text-xs',
        conspicuous ? 'font-medium text-warning-400' : 'text-zinc-500',
      )}
    >
      {[label, source].filter(Boolean).join(' · ')}
    </span>
  )
}

function FreshnessIndicator({
  asOf,
  ageSeconds,
  stale,
}: Readonly<{ asOf?: string | null; ageSeconds?: number | null; stale?: boolean }>) {
  if (!asOf && ageSeconds === null) return null
  return (
    <span className={clsx('text-xs', stale ? 'text-warning-400' : 'text-zinc-500')}>
      {/* `formatDateTime` et non l'ISO brut : « au 2026-08-04T04:28:48.914Z »
          est un format machine, illisible dans une console métier — et long de
          173 px, ce qui contribuait au débordement du bloc de métadonnées. */}
      {asOf ? `au ${formatDateTime(asOf)}` : null}
      {typeof ageSeconds === 'number' ? ` · ${ageSeconds}s` : null}
      {stale ? ' · fraîcheur insuffisante' : null}
    </span>
  )
}

/* ── Resolved value ───────────────────────────────────────────────────────── */

/**
 * Renders a backend value, or its state. A missing value shows '—': never
 * 0, never 0%, never an estimate.
 */
export function ResolvedValue({
  value,
  status,
  unit,
  className,
}: Readonly<{ value: string | number | null | undefined; status?: ResolvedStatus; unit?: string; className?: string }>) {
  const displayable =
    value !== null && value !== undefined && (typeof value !== 'number' || Number.isFinite(value))

  if (!displayable) {
    return (
      <span className={clsx(className, 'text-zinc-500')} title={status ? STATUS_LABEL[status] : 'Aucune valeur reçue'}>
        —
      </span>
    )
  }

  return (
    <span className={clsx(className, 'tabular-nums text-white')}>
      {typeof value === 'number' ? formatNumber(value) : value}
      {unit ? <span className="ml-1 text-zinc-500">{unit}</span> : null}
    </span>
  )
}

/* ── Call metadata ────────────────────────────────────────────────────────── */

export function RequestMetadata({ trace }: Readonly<{ trace: CallTrace }>) {
  const bits = [
    trace.httpStatus !== null ? `HTTP ${trace.httpStatus}` : 'aucune réponse',
    `${trace.durationMs}ms`,
    trace.requestId ? `req ${trace.requestId}` : null,
    trace.rateLimitRemaining !== null ? `quota ${trace.rateLimitRemaining}` : null,
  ].filter(Boolean)

  return <p className="font-mono text-xs break-all text-zinc-500">{bits.join(' · ')}</p>
}

export function EnvelopeMetaLine({ meta }: Readonly<{ meta: EnvelopeMeta | null }>) {
  if (!meta) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusBadge status={meta.status} />
      <DataProvenance source={meta.source} />
      <FreshnessIndicator asOf={meta.generatedAt} ageSeconds={meta.freshnessSeconds} />
      {meta.reason ? <span className="text-xs text-warning-400">{meta.reason}</span> : null}
    </div>
  )
}

/* ── No-data states ──────────────────────────────────────────────────────── */

/*
 * `bg-cockpit-inset` est CONSERVÉ ici, et ce n'est pas un oubli de convergence
 * (décision du 2026-08-04, LOT E).
 *
 * La famille `cockpit-*` est marquée « alias compatibilité » dans
 * `tailwind.css`, et la tentation est de la remplacer par `console-inset`. Les
 * valeurs ne sont pas les mêmes : `--color-cockpit-inset` vaut #0b0e17,
 * `--color-console-inset` vaut #202020.
 *
 * Ces trois surfaces enfoncées vivent à l'intérieur d'un `.panel` du module de
 * la console, dont le dégradé descend jusqu'à #030304. Un enfoncé à #0b0e17 s'y
 * creuse ; un enfoncé à #202020 serait PLUS CLAIR que son conteneur — il
 * ressortirait au lieu de s'enfoncer, et l'état « pas de données » se lirait
 * comme une carte mise en avant.
 *
 * Converger ces trois usages suppose donc d'arbitrer la valeur du plan enfoncé
 * de la console, ce qui change le rendu : c'est une décision de design system,
 * pas un renommage de token. Tant qu'elle n'est pas prise, `--color-cockpit-inset`
 * reste consommé et ne figure pas dans les candidats à la suppression.
 */

function StateShell({
  status,
  title,
  reason,
  children,
}: Readonly<{ status: ResolvedStatus; title: string; reason?: string | null; children?: React.ReactNode }>) {
  return (
    <div className="rounded-lg border border-dashed border-console-line bg-cockpit-inset px-5 py-8 text-center">
      <StatusBadge status={status} />
      <p className="mt-3 text-sm font-medium text-white">{title}</p>
      {reason ? <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400">{reason}</p> : null}
      {children}
    </div>
  )
}

export function EmptyState({ reason }: Readonly<{ reason?: string | null }>) {
  return <StateShell status="EMPTY" title="Réponse vide" reason={reason ?? 'Le backend a répondu sans aucun élément.'} />
}

export function UnavailableState({ state, children }: Readonly<{ state: Resolved<unknown>; children?: React.ReactNode }>) {
  return (
    <StateShell status={state.status} title={STATUS_LABEL[state.status]} reason={state.reason}>
      {state.provenance.route ? (
        <p className="mt-3 font-mono text-xs break-all text-zinc-600">
          {state.provenance.route}
          {state.provenance.requestId ? ` · req ${state.provenance.requestId}` : null}
        </p>
      ) : null}
      {children}
    </StateShell>
  )
}

/** Renders a backend `Problem` as-is — the machine code is authoritative. */
export function ProblemState({ problem, keeper }: Readonly<{ problem: Problem | null; keeper?: KeeperActionResult | null }>) {
  if (!problem && !keeper) return null

  return (
    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-cockpit-inset p-4 text-xs">
      {problem ? (
        <>
          <dt className="text-zinc-500">code</dt>
          <dd className="font-mono text-white">{problem.code}</dd>
          <dt className="text-zinc-500">title</dt>
          <dd className="text-zinc-300">{problem.title}</dd>
          <dt className="text-zinc-500">detail</dt>
          <dd className="text-zinc-300">{problem.detail}</dd>
          <dt className="text-zinc-500">requestId</dt>
          <dd className="font-mono break-all text-zinc-400">{problem.requestId}</dd>
        </>
      ) : null}
      {keeper ? (
        <>
          <dt className="text-zinc-500">reason</dt>
          <dd className="font-mono text-white">{keeper.reason}</dd>
          {keeper.detail ? (
            <>
              <dt className="text-zinc-500">detail</dt>
              <dd className="text-zinc-300">{keeper.detail}</dd>
            </>
          ) : null}
        </>
      ) : null}
    </dl>
  )
}

/** Collapsed raw JSON — the technical evidence stays available, never forced. */
export function RawJsonPanel({ label = 'Réponse brute', data }: Readonly<{ label?: string; data: unknown }>) {
  return (
    <details className="mt-4 rounded-lg bg-cockpit-inset">
      <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white">{label}</summary>
      <pre className="overflow-x-auto px-4 pb-4 font-mono text-xs text-zinc-300">{JSON.stringify(data, null, 2)}</pre>
    </details>
  )
}
