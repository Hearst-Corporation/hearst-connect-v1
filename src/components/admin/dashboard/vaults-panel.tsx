'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import type { AdminVaultSummary } from '@/lib/admin-dashboard/load'
import { formatCurrency } from '@/lib/format'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'

function driftPts(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

function VaultCard({ vault }: Readonly<{ vault: AdminVaultSummary }>) {
  const deployedLine =
    vault.deployedPct !== null ? `${vault.deployedPct}% deployed` : '— deployed'
  const availableLine =
    vault.availableAtomic !== null
      ? `${formatCurrency(vault.availableAtomic, { fromAtomic: 1_000_000 })} available`
      : null

  return (
    <article className={clsx(surfaceInset, 'flex flex-col gap-2 p-4')}>
      <h3 className="text-sm font-semibold text-ink dark:text-fg">{vault.label}</h3>
      <p className="text-xl font-semibold tabular-nums text-ink dark:text-fg">
        {formatCurrency(vault.totalAssetsAtomic, { fromAtomic: 1_000_000 })}
      </p>
      <p className="text-xs text-fg-tertiary">
        {deployedLine}
        {availableLine !== null ? ` · ${availableLine}` : null}
      </p>
      <p className="text-xs text-fg-tertiary">
        {vault.strategiesCount} strateg{vault.strategiesCount > 1 ? 'ies' : 'y'}
        {vault.maxDriftBps !== null
          ? ` · Worst drift ${driftPts(vault.maxDriftBps)}`
          : null}
      </p>
      <HearstSecondaryAction href={`/admin/vaults/${encodeURIComponent(vault.id)}`} className="mt-1 self-start">
        Open
      </HearstSecondaryAction>
    </article>
  )
}

export function VaultsPanel({ vaults }: Readonly<{ vaults: Availability<readonly AdminVaultSummary[]> }>) {
  const reduced = useReducedMotion()

  if (!isAvailable(vaults)) {
    return <p className="text-sm text-fg-tertiary">Data unavailable</p>
  }
  if (vaults.value.length === 0) {
    return <p className="text-sm text-fg-tertiary">Source unavailable</p>
  }

  const grid = (
    <div
      data-widget="vaults-panel"
      className={clsx('grid gap-3', vaults.value.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
    >
      {vaults.value.map((vault) => (
        <VaultCard key={vault.id} vault={vault} />
      ))}
    </div>
  )

  if (reduced) return grid
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {grid}
    </motion.div>
  )
}
