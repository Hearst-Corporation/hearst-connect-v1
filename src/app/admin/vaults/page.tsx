import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { Callout, DataTableShell, SectionCard, tableCol } from '@/components/compositions'
import { entityHref } from '@/components/vaults/vault-entity-link'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import {
  available,
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

function rebalanceLabel(vault: Vault): Availability<string> {
  if (!isAvailable(vault.rebalancing)) return absentReading(vault.rebalancing)
  const at = vault.rebalancing.value.lastRebalanceAt
  if (at === null) return unavailable({ status: 'EMPTY', reason: 'last_rebalance_not_reported' })
  return available(formatRelativeTime(at), {
    provenance: vault.rebalancing.provenance,
    asOf: vault.rebalancing.asOf,
    stale: vault.rebalancing.stale,
  })
}

/** Primary desk: six fields. Chain, strategies, activity live on vault detail. */
function VaultPrimaryRow({ vault }: Readonly<{ vault: Vault }>) {
  const href = entityHref('vault', vault.id)
  const driftBps = valueOf(vault.worstDriftBps)
  const deployedBps = valueOf(vault.deployedBps)

  return (
    <TableRow href={href} title={`Open ${vault.label}`}>
      <TableCell className={tableCol.primary}>
        <div className="truncate font-medium">{vault.label}</div>
      </TableCell>
      <TableCell className={tableCol.numeric}>
        <AdminReading compact value={vaultAmount(vault, vault.totalAssetsAtomic)} />
      </TableCell>
      <TableCell className={tableCol.numeric}>
        <AdminReading compact value={vaultAmount(vault, deployedAtomic(vault))} />
        {deployedBps === null ? null : (
          <div className="mt-0.5 text-xs text-fg-tertiary">
            {formatPercent(deployedBps, { fromBps: true })}
          </div>
        )}
      </TableCell>
      <TableCell className={tableCol.numeric}>
        <AdminReading compact value={vaultAmount(vault, idleAtomic(vault))} />
      </TableCell>
      <TableCell className={tableCol.numeric}>
        {!isAvailable(vault.worstDriftBps) ? (
          <AdminReading compact value={absentReading(vault.worstDriftBps)} />
        ) : (
          driftPoints(driftBps!)
        )}
      </TableCell>
      <TableCell className={tableCol.date}>
        <AdminReading compact value={rebalanceLabel(vault)} emptyLabel="Not reported" />
      </TableCell>
    </TableRow>
  )
}

function VaultMobileCard({ vault }: Readonly<{ vault: Vault }>) {
  const href = entityHref('vault', vault.id)
  const driftBps = valueOf(vault.worstDriftBps)
  const deployedBps = valueOf(vault.deployedBps)

  return (
    <li>
      <Link
        href={href}
        className="-mx-2 block rounded-md px-2 py-3 transition-colors hover:bg-console-inset/40"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-semibold text-fg">{vault.label}</p>
          <p className="shrink-0 tabular-nums text-sm text-fg">
            {!isAvailable(vault.worstDriftBps) ? '—' : driftPoints(driftBps!)}
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-fg-tertiary">AUM</dt>
            <dd className="mt-0.5 tabular-nums text-fg">
              <AdminReading compact value={vaultAmount(vault, vault.totalAssetsAtomic)} />
            </dd>
          </div>
          <div>
            <dt className="text-fg-tertiary">Deployed</dt>
            <dd className="mt-0.5 tabular-nums text-fg">
              <AdminReading compact value={vaultAmount(vault, deployedAtomic(vault))} />
              {deployedBps === null ? null : (
                <span className="mt-0.5 block text-fg-tertiary">
                  {formatPercent(deployedBps, { fromBps: true })}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-fg-tertiary">Available</dt>
            <dd className="mt-0.5 tabular-nums text-fg">
              <AdminReading compact value={vaultAmount(vault, idleAtomic(vault))} />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-fg-tertiary">
          Rebalance · <AdminReading compact value={rebalanceLabel(vault)} emptyLabel="Not reported" />
        </p>
      </Link>
    </li>
  )
}

function VaultRegistryBody({ vaultList }: Readonly<{ vaultList: readonly Vault[] }>) {
  return (
    <>
      <div className="hidden min-w-0 lg:block">
        <DataTableShell
          title="Vaults"
          description="Capital and allocation drift as reported by the service. Open a row for chain, strategies, and activity."
          count={`${formatNumber(vaultList.length)} vault(s)`}
        >
          <TableHead>
            <TableRow>
              <TableHeader className={tableCol.primary}>Vault</TableHeader>
              <TableHeader className={tableCol.numeric}>AUM</TableHeader>
              <TableHeader className={tableCol.numeric}>Deployed</TableHeader>
              <TableHeader className={tableCol.numeric}>Available</TableHeader>
              <TableHeader className={tableCol.numeric}>Drift</TableHeader>
              <TableHeader className={tableCol.date}>Rebalance</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {vaultList.map((vault) => (
              <VaultPrimaryRow key={vault.id} vault={vault} />
            ))}
          </TableBody>
        </DataTableShell>
      </div>

      <SectionCard
        title="Vaults"
        hint="Capital and allocation drift as reported by the service."
        className="lg:hidden"
        actions={
          <span className="text-xs text-fg-tertiary">{formatNumber(vaultList.length)} vault(s)</span>
        }
      >
        <ul className="divide-y divide-console-line-soft">
          {vaultList.map((vault) => (
            <VaultMobileCard key={vault.id} vault={vault} />
          ))}
        </ul>
      </SectionCard>
    </>
  )
}

/**
 * Cockpit side rail — the parc-level facts that frame the registry table:
 * how many vaults carry drift, and where to reconcile the read. Bounded
 * secondary column; the registry table absorbs the row.
 */
function VaultParcRail({ vaultList }: Readonly<{ vaultList: readonly Vault[] }>) {
  const withDrift = vaultList.filter((v) => {
    const bps = valueOf(v.worstDriftBps)
    return bps !== null && bps !== 0
  }).length
  const worstDrift = vaultList.reduce<number | null>((max, v) => {
    const bps = valueOf(v.worstDriftBps)
    if (bps === null) return max
    return max === null || Math.abs(bps) > Math.abs(max) ? bps : max
  }, null)

  return (
    <aside className="flex flex-col gap-4">
      <SectionCard title="Parc" hint="Registry-wide read at a glance.">
        <dl className="space-y-4">
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-tertiary">
              Vaults off target
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">
              {formatNumber(withDrift)}
              <span className="ml-1 text-sm font-normal text-fg-tertiary">
                / {formatNumber(vaultList.length)}
              </span>
            </dd>
          </div>
          <div className="min-w-0 border-t border-console-line-soft pt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-fg-tertiary">
              Worst drift
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">
              {worstDrift === null ? '—' : driftPoints(worstDrift)}
            </dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Source" hint="Where this read comes from.">
        <Text className="text-sm text-fg-secondary">
          Vault capital and drift are read from the service.{' '}
          <Link href="/admin/runtime" className="underline">
            Source health
          </Link>
          .
        </Text>
      </SectionCard>
    </aside>
  )
}

function VaultRegistryContent({ vaultList }: Readonly<{ vaultList: readonly Vault[] | null }>) {
  if (vaultList === null) {
    return (
      <Callout tone="warning" title="Vault read unavailable">
        The vault read did not succeed.{' '}
        <Link href={entityHref('source', 'vault')} className="text-accent-400">
          Data coverage
        </Link>
      </Callout>
    )
  }

  if (vaultList.length === 0) {
    return (
      <DataTableShell
        title="Vaults"
        description="Capital and allocation drift as reported by the service."
        calme="The service responded with no vault in the registry."
      />
    )
  }

  // Cockpit row: the registry table absorbs the space (minmax(0,1fr)); the
  // parc rail is bounded (minmax(16rem,20rem)). items-start so neither the
  // dataset nor the rail dictates the row height.
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="min-w-0">
        <VaultRegistryBody vaultList={vaultList} />
      </div>
      <VaultParcRail vaultList={vaultList} />
    </div>
  )
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

      <VaultRegistryContent vaultList={vaultList} />

      <Text className="text-sm text-fg-secondary">
        Source health and endpoint coverage:{' '}
        <Link href="/admin/runtime" className="underline">
          Service
        </Link>
        .
      </Text>
    </div>
  )
}
