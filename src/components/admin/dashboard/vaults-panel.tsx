import { PanelFooterLink, PanelState } from '@/components/admin/dashboard/panel-state'
import { HearstSecondaryAction } from '@/components/actions'
import { formatDriftPts, strategySuffix } from '@/lib/format'
import type { AdminAssetScale } from '@/lib/admin-dashboard/format-atomic'
import { formatAdminAtomic } from '@/lib/admin-dashboard/format-atomic'
import type { AdminVaultSummary } from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'

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
    <article className="flex flex-col gap-2 border-t border-console-line-soft pt-4 first:border-t-0 first:pt-0">
      <h3 className="truncate text-sm font-semibold text-fg">{vault.label}</h3>
      <p className="text-xl font-semibold tabular-nums text-fg">
        {formatAdminAtomic(vault.totalAssetsAtomic, assetScale)}
      </p>
      <p className="text-xs text-fg-tertiary">
        {deployedLine}
        {availableLine !== null ? ` · ${availableLine}` : null}
      </p>
      <p className="text-xs text-fg-tertiary">
        {vault.strategiesCount} strateg{strategySuffix(vault.strategiesCount)}
        {vault.maxDriftBps !== null ? ` · Worst drift ${formatDriftPts(vault.maxDriftBps)}` : null}
      </p>
      <HearstSecondaryAction href={`/admin/vaults/${encodeURIComponent(vault.id)}`} className="mt-1 self-start">
        Open
      </HearstSecondaryAction>
    </article>
  )
}

function VaultsState({ title, detail }: Readonly<{ title: string; detail: string }>) {
  return (
    <div className="space-y-4">
      <PanelState title={title} detail={detail} />
      <PanelFooterLink href="/admin/vaults" label="View all vaults" />
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
    return <VaultsState title="Data unavailable" detail="Vault source unavailable." />
  }
  if (vaults.value.length === 0) {
    return <VaultsState title="No vaults reported" detail="No vault summary rows in the registry." />
  }
  if (!assetScale) {
    return (
      <VaultsState
        title="Portfolio asset scale unavailable"
        detail="Amounts stay hidden until the portfolio scale is readable."
      />
    )
  }

  return (
    <div className="space-y-4" data-widget="vaults-panel">
      <div className="space-y-3">
        {vaults.value.map((vault) => (
          <VaultCard key={vault.id} vault={vault} assetScale={assetScale} />
        ))}
      </div>
      <PanelFooterLink href="/admin/vaults" label="View all vaults" />
    </div>
  )
}
