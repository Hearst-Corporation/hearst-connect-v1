import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import type { Resolved, ResolvedStatus } from '@/lib/resolved'
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  LockClosedIcon,
  NoSymbolIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'

/**
 * Rendu des états sans donnée. Le module garde sa place et son libellé ;
 * seul le contenu chiffré disparaît, remplacé par une explication vérifiable.
 */

type Presentation = {
  icon: typeof InboxIcon
  title: string
  badge: { label: string; color: 'zinc' | 'amber' | 'red' } | null
}

const presentations: Record<Exclude<ResolvedStatus, 'LIVE' | 'STALE' | 'PARTIAL'>, Presentation> = {
  EMPTY: { icon: InboxIcon, title: 'Aucun résultat', badge: null },
  NOT_CONFIGURED: {
    icon: WrenchScrewdriverIcon,
    title: 'Source non configurée',
    badge: { label: 'Non configuré', color: 'amber' },
  },
  UNAVAILABLE: {
    icon: ExclamationTriangleIcon,
    title: 'Données temporairement indisponibles',
    badge: { label: 'Indisponible', color: 'red' },
  },
  NOT_SUPPORTED: {
    icon: NoSymbolIcon,
    title: 'Non supporté par le contrat ou le backend',
    badge: { label: 'Non supporté', color: 'zinc' },
  },
  PERMISSION_DENIED: {
    icon: LockClosedIcon,
    title: 'Autorisation insuffisante',
    badge: { label: 'Accès refusé', color: 'red' },
  },
  SIMULATED: {
    icon: NoSymbolIcon,
    title: 'Donnée simulée — non exploitable en production',
    badge: { label: 'Simulé', color: 'amber' },
  },
  ERROR: { icon: ExclamationTriangleIcon, title: 'Erreur', badge: { label: 'Erreur', color: 'red' } },
}

/** Détail de provenance : route interrogée, champ, fraîcheur, requestId. */
function ProvenanceLine({ state }: Readonly<{ state: Resolved<unknown> }>) {
  const bits = [
    state.provenance.route ? `route ${state.provenance.route}` : null,
    state.provenance.field ? `champ ${state.provenance.field}` : null,
    state.provenance.fetchedAt ? `reçu ${state.provenance.fetchedAt}` : null,
    state.provenance.requestId ? `requestId ${state.provenance.requestId}` : null,
  ].filter(Boolean)

  if (bits.length === 0) return null

  return <p className="mt-3 font-mono text-xs/5 break-all text-zinc-400 dark:text-zinc-500">{bits.join(' · ')}</p>
}

export function DataState({
  state,
  retryAction,
}: Readonly<{ state: Resolved<unknown>; retryAction?: React.ReactNode }>) {
  if (state.status === 'LIVE' || state.status === 'STALE' || state.status === 'PARTIAL') return null

  const presentation = presentations[state.status]
  const Icon = presentation.icon

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-zinc-950/10 px-6 py-12 text-center dark:border-white/10">
      <Icon aria-hidden="true" className="size-8 text-zinc-400 dark:text-zinc-500" />
      <p className="mt-4 text-base/6 font-semibold text-zinc-950 dark:text-white">{presentation.title}</p>
      {state.reason ? <Text className="mt-2 max-w-xl">{state.reason}</Text> : null}
      <ProvenanceLine state={state} />
      {retryAction ? <div className="mt-6">{retryAction}</div> : null}
    </div>
  )
}

/** Pastille de statut, à côté du titre d'un module. */
export function StatusBadge({ state }: Readonly<{ state: Resolved<unknown> }>) {
  if (state.status === 'LIVE') return null

  if (state.status === 'STALE' || state.status === 'PARTIAL') {
    return (
      <Badge color="amber">{state.status === 'STALE' ? 'Fraîcheur insuffisante' : 'Réponse partielle'}</Badge>
    )
  }

  const badge = presentations[state.status].badge
  return badge ? <Badge color={badge.color}>{badge.label}</Badge> : null
}

/** Squelette de chargement — affiché uniquement pendant une requête réelle. */
export function TableSkeleton({ rows = 4, columns = 4 }: Readonly<{ rows?: number; columns?: number }>) {
  return (
    <div aria-hidden="true" className="mt-4 animate-pulse space-y-3">
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: columns }, (_, column) => (
            <div key={column} className="h-4 flex-1 rounded bg-zinc-950/5 dark:bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Bouton de relance — repose sur une Server Action de revalidation réelle. */
export function RetryButton({ action, children }: Readonly<{ action: () => Promise<void>; children: React.ReactNode }>) {
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm/6 font-semibold text-zinc-950 ring-1 ring-zinc-950/10 hover:bg-zinc-950/5 dark:text-white dark:ring-white/15 dark:hover:bg-white/10"
      >
        <ArrowPathIcon aria-hidden="true" className="size-4" />
        {children}
      </button>
    </form>
  )
}
