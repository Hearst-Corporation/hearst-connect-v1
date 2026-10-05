import { DashCard, DashboardHeader, DashboardShell, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { AdminReading } from '@/components/admin/reading'
import { ResultCount } from '@hearst/ui/page'
import { Link } from '@hearst/ui/catalyst/link'
import { Text } from '@hearst/ui/catalyst/text'
import { ListTable, RowBadge } from '@hearst/ui/table'
import { CircleStackIcon } from '@heroicons/react/20/solid'
import { Callout, DataTableShell } from '@/components/compositions'
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

function deployedCell(vault: Vault) {
  const deployedBps = valueOf(vault.deployedBps)
  return (
    <>
      <AdminReading compact value={vaultAmount(vault, deployedAtomic(vault))} />
      {deployedBps === null ? null : (
        <div className="text-xs text-(--ds-shell-subtle)">{formatPercent(deployedBps, { fromBps: true })}</div>
      )}
    </>
  )
}

function driftCell(vault: Vault) {
  if (!isAvailable(vault.worstDriftBps)) return <AdminReading compact value={absentReading(vault.worstDriftBps)} />
  return driftPoints(vault.worstDriftBps.value)
}

/**
 * The registry list keeps one box whatever the row count: taller datasets
 * scroll inside, so the box ends on the rail's line.
 */
const REGISTRY_SLOT_CLASS = 'h-[312px]'

function VaultRegistryBody({ vaultList }: Readonly<{ vaultList: readonly Vault[] }>) {
  return (
    <DashCard
      title="Vaults"
      subtitle="Capital and allocation drift as reported by the service. Open a row for chain, strategies, and activity."
      action={<ResultCount>{formatNumber(vaultList.length)} vault(s)</ResultCount>}
      contentClassName={REGISTRY_SLOT_CLASS}
    >
      <ListTable
        label="Vault registry"
        className="-mx-5"
        rows={[...vaultList]}
        rowKey={(vault) => vault.id}
        href={(vault) => entityHref('vault', vault.id)}
        rowLabel={(vault) => `Open ${vault.label}`}
        identity={{
          header: 'Vault',
          badge: () => <RowBadge icon={CircleStackIcon} />,
          title: (vault) => vault.label,
          detail: (vault) => <AdminReading compact value={rebalanceLabel(vault)} emptyLabel="Not reported" />,
        }}
        columns={[
          { key: 'aum', header: 'AUM', cell: (vault) => <AdminReading compact value={vaultAmount(vault, vault.totalAssetsAtomic)} /> },
          { key: 'deployed', header: 'Deployed', hideBelow: 'md', cell: deployedCell },
          {
            key: 'available',
            header: 'Available',
            hideBelow: 'lg',
            cell: (vault) => <AdminReading compact value={vaultAmount(vault, idleAtomic(vault))} />,
          },
          { key: 'drift', header: 'Drift', cell: driftCell },
        ]}
      />
    </DashCard>
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
    <aside className="flex min-w-0 flex-col gap-(--ds-page-gap)">
      <DashCard title="Fleet" subtitle="Registry-wide read at a glance.">
        <dl className="space-y-4">
          <div className="min-w-0">
            <dt className="text-xs font-medium uppercase tracking-wide text-(--ds-shell-subtle)">
              Vaults off target
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-(--ds-text)">
              {formatNumber(withDrift)}
              <span className="ml-1 text-sm font-normal text-(--ds-shell-subtle)">
                / {formatNumber(vaultList.length)}
              </span>
            </dd>
          </div>
          <div className="min-w-0 border-t border-(--ds-divider) pt-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-(--ds-shell-subtle)">
              Worst drift
            </dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-(--ds-text)">
              {worstDrift === null ? '—' : driftPoints(worstDrift)}
            </dd>
          </div>
        </dl>
      </DashCard>

      {/* The "full view" link lives on the title row — no bordered footer strip. */}
      <DashCard
        title="Source"
        subtitle="Where this read comes from."
        action={<PanelHeaderLink href="/admin/runtime">Source health</PanelHeaderLink>}
      >
        <Text className="text-sm text-(--ds-text-subtle)">
          Vault capital and drift are read from the service.
        </Text>
      </DashCard>
    </aside>
  )
}

function VaultRegistryContent({ vaultList }: Readonly<{ vaultList: readonly Vault[] | null }>) {
  if (vaultList === null) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <Callout tone="warning" title="Vault read unavailable">
            The vault read did not succeed.{' '}
            <Link href={entityHref('source', 'vault')} className="text-(--ds-accent)">
              Data coverage
            </Link>
          </Callout>
        </BentoCard>
      </BentoGrid>
    )
  }

  if (vaultList.length === 0) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <DataTableShell
            title="Vaults"
            description="Capital and allocation drift as reported by the service."
            calme="The service responded with no vault in the registry."
          />
        </BentoCard>
      </BentoGrid>
    )
  }

  // BALANCED ROW — the registry table is the dominant panel (span 8, frozen
  // slot); the rail stacks the two small cards (span 4) to meet it. No voids:
  // below the container threshold everything collapses to one column.
  return (
    <BentoGrid>
      <BentoCard span={8}>
        <VaultRegistryBody vaultList={vaultList} />
      </BentoCard>
      <BentoCard span={4}>
        <VaultParcRail vaultList={vaultList} />
      </BentoCard>
    </BentoGrid>
  )
}

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)
  const activeVaults = activeVaultCount(registry.vaults)
  const totalVaults = measuredCount(registry.vaults)
  const vaultList = valueOf(registry.vaults)

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'active', title: 'Active vaults', value: activeVaults },
    { id: 'listed', title: 'Vaults listed', value: totalVaults },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Vaults"
        kpis={kpis}
      />

      <VaultRegistryContent vaultList={vaultList} />
    </DashboardShell>
  )
}
