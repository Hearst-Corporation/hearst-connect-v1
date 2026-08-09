import { HearstSecondaryAction } from '@/components/actions'
import { surfaceInset } from '@/components/admin/surface'
import { strategySuffix } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminVaultSummary } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'
import clsx from 'clsx'

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
      <h3 className="truncate text-sm font-semibold text-ink dark:text-fg">{vault.label}</h3>
      <p className="text-xl font-semibold tabular-nums text-ink dark:text-fg">
        {formatAdminAtomic(vault.totalAssetsAtomic, assetScale)}
      </p>
      <p className="text-xs text-fg-tertiary">
        {deployedLine}
        {availableLine !== null ? ` · ${availableLine}` : null}
      </p>
      <p className="text-xs text-fg-tertiary">
        {vault.strategiesCount} strateg{strategySuffix(vault.strategiesCount)}
        {vault.maxDriftBps !== null ? ` · Worst drift ${driftPts(vault.maxDriftBps)}` : null}
      </p>
      <HearstSecondaryAction href={`/admin/vaults/${encodeURIComponent(vault.id)}`} className="mt-1 self-start">
        Open
      </HearstSecondaryAction>
    </article>
  )
}

function VaultsFooter() {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
      <HearstSecondaryAction href="/admin/vaults">View all vaults</HearstSecondaryAction>
    </div>
  )
}

export function VaultsPanel({
  vaults,
  assetScale,
}: Readonly<{
  vaults: Availability<readonly AdminVaultSummary[]>
  assetScale: AdminAssetScale | null
}>) {
  if (!isAvailable(vaults)) {
    return (
      <div className="space-y-4">
        <div className={clsx(surfaceInset, 'flex flex-col justify-center gap-2 px-4 py-5')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">Data unavailable</p>
          <p className="text-xs text-fg-tertiary">Vault source unavailable.</p>
        </div>
        <VaultsFooter />
      </div>
    )
  }
  if (vaults.value.length === 0) {
    return (
      <div className="space-y-4">
        <div className={clsx(surfaceInset, 'flex flex-col justify-center gap-2 px-4 py-5')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">No vaults reported</p>
          <p className="text-xs text-fg-tertiary">No vault summary rows in the registry.</p>
        </div>
        <VaultsFooter />
      </div>
    )
  }
  if (!assetScale) {
    return (
      <div className="space-y-4">
        <div className={clsx(surfaceInset, 'flex flex-col justify-center gap-2 px-4 py-5')}>
          <p className="text-sm font-semibold text-ink dark:text-fg">Portfolio asset scale unavailable</p>
          <p className="text-xs text-fg-tertiary">Amounts stay hidden until the portfolio scale is readable.</p>
        </div>
        <VaultsFooter />
      </div>
    )
  }

  return (
    <div className="space-y-4" data-widget="vaults-panel">
      <div className="space-y-3">
        {vaults.value.map((vault) => (
          <VaultCard key={vault.id} vault={vault} assetScale={assetScale} />
        ))}
      </div>
      <VaultsFooter />
    </div>
  )
}
