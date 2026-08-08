'use client'

import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminVaultSummary } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

function driftPts(driftBps: number): string {
  const pts = driftBps / 100
  const sign = pts > 0 ? '+' : ''
  return `${sign}${pts.toLocaleString('en-US', { maximumFractionDigits: 2 })} pt`
}

function VaultCard({
  vault,
  assetScale,
}: Readonly<{ vault: AdminVaultSummary; assetScale: AdminAssetScale }>) {
  const deployedLine =
    vault.deployedPct !== null ? `${vault.deployedPct}% deployed` : '— deployed'
  const availableLine =
    vault.availableAtomic !== null
      ? `${formatAdminAtomic(vault.availableAtomic, assetScale)} available`
      : null

  return (
    <article className={clsx(surfaceInset, 'flex flex-col gap-2 p-4')}>
      <h3 className="text-sm font-semibold text-ink dark:text-fg">{vault.label}</h3>
      <p className="text-xl font-semibold tabular-nums text-ink dark:text-fg">
        {formatAdminAtomic(vault.totalAssetsAtomic, assetScale)}
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

export function VaultsPanel({
  vaults,
  assetScale,
}: Readonly<{
  vaults: Availability<readonly AdminVaultSummary[]>
  assetScale: AdminAssetScale | null
}>) {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
    setMounted(true)
  }, [])

  if (!isAvailable(vaults)) {
    return <p className="text-sm text-fg-tertiary">Data unavailable</p>
  }
  if (vaults.value.length === 0) {
    return <p className="text-sm text-fg-tertiary">No vaults reported</p>
  }
  if (!assetScale) {
    return <p className="text-sm text-fg-tertiary">Portfolio asset scale unavailable</p>
  }

  const grid = (
    <div
      data-widget="vaults-panel"
      className={clsx('grid gap-3', vaults.value.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
    >
      {vaults.value.map((vault) => (
        <VaultCard key={vault.id} vault={vault} assetScale={assetScale} />
      ))}
    </div>
  )

  if (!mounted || reduced) return grid
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      {grid}
    </motion.div>
  )
}
