import { Badge } from '@/components/catalyst/badge'
import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { Panel } from '@/components/compositions/panel'
import { chartTheme } from '@/components/charts/core/chart-theme'
import { formatNumber } from '@/lib/format'
import type { Availability } from '@/lib/vaults/model'
import { isAvailable } from '@/lib/vaults/model'
import clsx from 'clsx'

/**
 * Widgets cockpit — surfaces visuelles pour suivre le patrimoine.
 *
 * Aucune figure inventée : chaque widget lit une `Availability` ou une
 * série déjà dérivée. Une absence reste un état nommé, jamais un zéro.
 */

/** Jauge de déploiement (ratio en basis points → barre remplie). */
export function DeploymentGauge({
  ratioBps,
  label = 'Taux de déploiement',
  className,
}: Readonly<{
  ratioBps: Availability<number>
  label?: string
  className?: string
}>) {
  if (!isAvailable(ratioBps)) {
    return (
      <Panel tone="wave" className={clsx('space-y-3', className)}>
        <div className="space-y-3 px-5 py-4">
          <Subheading level={3}>{label}</Subheading>
          <Text className="text-sm text-zinc-500">Ratio indisponible — source absente ou incomplète.</Text>
        </div>
      </Panel>
    )
  }

  const pct = Math.min(100, Math.max(0, ratioBps.value / 100))
  const display = `${formatNumber(pct, { maximumFractionDigits: 1 })} %`
  const health = pct >= 80 ? 'lime' : pct >= 50 ? 'amber' : 'zinc'

  return (
    <Panel tone="wave" className={className} data-widget="deployment-gauge">
      <div className="space-y-4 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <Subheading level={3}>{label}</Subheading>
          <Badge color={health}>{display}</Badge>
        </div>
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={label}
        >
          <div
            className="h-full rounded-full bg-accent-400 transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <Text className="text-xs text-zinc-500 dark:text-zinc-400">
          Capital déployé rapporté au total lisible (déployé + disponible).
        </Text>
      </div>
    </Panel>
  )
}

type SourceRow = Readonly<{
  id: string
  label: string
  status: string
}>

/** Bandeau de santé des sources du registre. */
export function SourceHealthStrip({
  sources,
  className,
}: Readonly<{ sources: readonly SourceRow[]; className?: string }>) {
  const live = sources.filter((s) => s.status === 'LIVE').length
  const total = sources.length

  return (
    <Panel tone="wave" className={className} data-widget="source-health">
      <div className="space-y-4 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <Subheading level={3}>Sources du registre</Subheading>
        <Text className="tabular-nums text-sm text-zinc-500">
          {formatNumber(live)} / {formatNumber(total)} en direct
        </Text>
      </div>
      {total === 0 ? (
        <Text className="text-sm text-zinc-500">Aucune source déclarée dans le registre.</Text>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {sources.map((source) => {
            const liveStatus = source.status === 'LIVE'
            return (
              <li
                key={source.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/60"
              >
                <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">{source.label}</span>
                <Badge color={liveStatus ? 'lime' : 'zinc'}>{source.status}</Badge>
              </li>
            )
          })}
        </ul>
      )}
      </div>
    </Panel>
  )
}

/** Anneau SVG de couverture (parts live / total). */
export function CoverageRing({
  live,
  total,
  label = 'Couverture sources',
  className,
}: Readonly<{
  live: number
  total: number
  label?: string
  className?: string
}>) {
  if (total <= 0) {
    return (
      <Panel tone="wave" className={className}>
        <div className="flex flex-col items-center gap-3 px-5 py-4">
          <Subheading level={3}>{label}</Subheading>
          <Text className="text-sm text-zinc-500">Aucun dénominateur — rien à mesurer.</Text>
        </div>
      </Panel>
    )
  }

  const pct = Math.round((live / total) * 100)
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c * (1 - live / total)
  const stroke = chartTheme.dataSeries.brandPrimary
  const track = chartTheme.dataSeries.dataReference
  const health = pct >= 80 ? 'lime' : pct >= 50 ? 'amber' : 'zinc'

  return (
    <Panel tone="wave" className={className} data-widget="coverage-ring">
      <div className="flex flex-col items-center gap-3 px-5 py-4">
      <div className="flex w-full items-baseline justify-between gap-3">
        <Subheading level={3}>{label}</Subheading>
        <Badge color={health}>{pct}%</Badge>
      </div>
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true" className="mt-2">
        <circle cx="60" cy="60" r={r} fill="none" stroke={track} strokeWidth="10" strokeOpacity={0.35} />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="64"
          textAnchor="middle"
          className="fill-zinc-950 text-xl font-semibold tabular-nums dark:fill-white"
        >
          {pct}%
        </text>
      </svg>
      <Text className="text-xs tabular-nums text-zinc-500">
        {formatNumber(live)} sources LIVE sur {formatNumber(total)}
      </Text>
      </div>
    </Panel>
  )
}

/** Carte capital déployé / disponible côte à côte. */
export function CapitalSplit({
  deployed,
  available,
  className,
}: Readonly<{
  deployed: Availability<string>
  available: Availability<string>
  className?: string
}>) {
  return (
    <Panel tone="wave" className={className} data-widget="capital-split">
      <div className="space-y-4 px-5 py-4">
        <Subheading level={3}>Répartition du capital</Subheading>
        <div className="grid grid-cols-2 gap-4">
      <div>
        <Text className="text-xs uppercase tracking-wide text-zinc-500">Déployé</Text>
        <p className="mt-1 text-xl font-semibold tabular-nums text-accent-400">
          {isAvailable(deployed) ? deployed.value : '—'}
        </p>
        {isAvailable(deployed) && <Badge color="lime" className="mt-2">Actif</Badge>}
      </div>
      <div>
        <Text className="text-xs uppercase tracking-wide text-zinc-500">Disponible</Text>
        <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-300">
          {isAvailable(available) ? available.value : '—'}
        </p>
        {isAvailable(available) && <Badge color="zinc" className="mt-2">Réserve</Badge>}
      </div>
      </div>
      </div>
    </Panel>
  )
}
