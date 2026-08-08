import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { entityHref } from '@/components/vaults/vault-entity-link'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import {
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  measuredCount,
  unavailable,
  valueOf,
  type Availability,
  type Unavailable,
  type Vault,
} from '@/lib/vaults/model'
import { activeVaultCount } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { ArchiveBoxIcon, BuildingLibraryIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vaults' }
export const dynamic = 'force-dynamic'

function vaultAmount(vault: Vault, reading: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, reading, (asset, raw) =>
    formatCurrency(raw.toString(), { unit: `${asset.symbol} `, fromAtomic: 10 ** asset.decimals }),
  )
}

function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
}

function absentReading(source: Unavailable): Availability<string> {
  return unavailable({
    endpoint: source.endpoint,
    status: source.status,
    reason: source.reason,
  })
}

function vaultShortAddress(vault: Vault): string {
  if (vault.chainId === null) {
    return `${vault.contractAddress.slice(0, 6)}…${vault.contractAddress.slice(-4)}`
  }
  return `chain ${vault.chainId} · ${vault.contractAddress.slice(0, 6)}…${vault.contractAddress.slice(-4)}`
}

function recentActivityLabel(vault: Vault): string | null {
  if (!isAvailable(vault.lastActivityAt)) return null
  const iso = vault.lastActivityAt.value
  if (iso === '') return null
  return formatRelativeTime(iso)
}

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)
  const activeVaults = activeVaultCount(registry.vaults)
  const totalVaults = measuredCount(registry.vaults)
  const vaultList = valueOf(registry.vaults)

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'active', title: 'Active vaults', value: activeVaults, icon: ArchiveBoxIcon },
    { id: 'listed', title: 'Vaults listed', value: totalVaults, icon: BuildingLibraryIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Vaults"
        description="Vault capital, strategies, drift, and rebalancing status."
        kpis={kpis}
      />

      {vaultList === null ? (
        <SectionCard title="Vaults" hint="Capital and allocation drift as reported by the service.">
          <Callout tone="warning" title="Vault read unavailable">
            The vault read did not succeed.{' '}
            <Link href={entityHref('source', 'vault')} className="text-accent-600 dark:text-accent-400">
              Data coverage
            </Link>
          </Callout>
        </SectionCard>
      ) : vaultList.length === 0 ? (
        <DataTableShell
          title="Vaults"
          description="Capital and allocation drift as reported by the service."
          calme="The service responded with no vault in the registry."
        />
      ) : (
        <DataTableShell
          title="Vaults"
          description="Capital and allocation drift as reported by the service."
          count={`${formatNumber(vaultList.length)} vault(s)`}
        >
          <TableHead>
            <TableRow>
              <TableHeader>Vault</TableHeader>
              <TableHeader>AUM</TableHeader>
              <TableHeader>Deployed</TableHeader>
              <TableHeader>Available</TableHeader>
              <TableHeader>Strategies</TableHeader>
              <TableHeader>Drift</TableHeader>
              <TableHeader>Last rebalance</TableHeader>
              <TableHeader>Recent activity</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {vaultList.map((vault) => {
              const strategies = valueOf(vault.strategies)
              const driftBps = valueOf(vault.worstDriftBps)
              const rebalancing = valueOf(vault.rebalancing)
              const deployedBps = valueOf(vault.deployedBps)
              const activity = recentActivityLabel(vault)

              return (
                <TableRow key={vault.id}>
                  <TableCell>
                    <Link href={entityHref('vault', vault.id)} className="font-medium">
                      {vault.label}
                    </Link>
                    <div
                      className="mt-0.5 font-mono text-xs text-fg-tertiary"
                      title={vault.contractAddress}
                    >
                      {vaultShortAddress(vault)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <AdminReading value={vaultAmount(vault, vault.totalAssetsAtomic)} />
                  </TableCell>
                  <TableCell>
                    <AdminReading value={vaultAmount(vault, deployedAtomic(vault))} />
                    {deployedBps === null ? null : (
                      <div className="mt-0.5 text-xs text-fg-tertiary">
                        {formatPercent(deployedBps, { fromBps: true })} of AUM
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <AdminReading value={vaultAmount(vault, idleAtomic(vault))} />
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.strategies) ? (
                      <AdminReading value={absentReading(vault.strategies)} />
                    ) : (
                      <span className="tabular-nums">{formatNumber(strategies!.length)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.worstDriftBps) ? (
                      <AdminReading value={absentReading(vault.worstDriftBps)} />
                    ) : (
                      <span className="tabular-nums">{driftPoints(driftBps!)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.rebalancing) ? (
                      <AdminReading value={absentReading(vault.rebalancing)} />
                    ) : rebalancing!.lastRebalanceAt === null ? (
                      <span className="text-fg-tertiary">Not reported</span>
                    ) : (
                      <span className="tabular-nums text-console-fill dark:text-fg">
                        {formatRelativeTime(rebalancing!.lastRebalanceAt)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.lastActivityAt) ? (
                      <AdminReading value={absentReading(vault.lastActivityAt)} />
                    ) : activity === null ? (
                      <span className="text-fg-tertiary">Not reported</span>
                    ) : (
                      <span className="tabular-nums">{activity}</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </DataTableShell>
      )}

      <Text className="text-sm text-fg-tertiary dark:text-fg-secondary">
        Source health and endpoint coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
