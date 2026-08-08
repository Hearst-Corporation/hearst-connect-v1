import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstAllocationChart, type PosteAllocation } from '@/components/charts'
import { DataTableShell, SectionCard } from '@/components/compositions'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { libelleStatutVault, VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { requireSession } from '@/lib/auth'
import { explorerTxUrl } from '@/lib/explorer'
import {
  formatAddress,
  formatCurrency,
  formatDateTime,
  formatHash,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/format'
import { libelleMouvement, phraseMouvement } from '@/lib/mouvements'
import {
  combine,
  deployedAtomic,
  editorial,
  idleAtomic,
  isAvailable,
  mapAvailability,
  parseVaultId,
  unavailable,
  type Availability,
  type Movement,
  type RebalancingRow,
  type Unavailable,
  type Vault,
  type VaultId,
} from '@/lib/vaults/model'
import { loadVault } from '@/lib/vaults/registry'
import {
  ArchiveBoxIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

const DOCUMENTED_DECIMALS = 6

type PageProps = Readonly<{ params: Promise<{ vaultId: string }> }>

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vaultId } = await params
  const parsed = parseVaultId(vaultId)
  if (parsed === null) return { title: 'Vault' }
  const short = formatAddress(parsed.contractAddress)
  return { title: short === null ? 'Vault' : `Vault ${short}` }
}

function absentReading(source: Unavailable): Availability<string> {
  return unavailable({
    endpoint: source.endpoint,
    status: source.status,
    reason: source.reason,
  })
}

function amountOf(vault: Vault, atomic: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, atomic, (asset, raw) => {
    const formatted = formatCurrency(raw.toString(), { unit: '', fromAtomic: 10 ** asset.decimals })
    return `${formatted} ${asset.symbol}`
  })
}

function driftPoints(bps: number): string {
  return `${formatNumber(bps / 100, {
    signDisplay: 'exceptZero',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} pt`
}

function driftPointsNullable(bps: number | null): string | null {
  if (bps === null || !Number.isFinite(bps)) return null
  return driftPoints(bps)
}

function pocketOf(row: RebalancingRow): string | null {
  const at = row.strategyId.lastIndexOf(':')
  if (at < 0 || at === row.strategyId.length - 1) return null
  return row.strategyId.slice(at + 1)
}

function movementAmount(movement: Movement, vault: Vault): string {
  if (movement.assetAmountAtomic === null) return '—'
  const measured = isAvailable(vault.asset) ? vault.asset.value : null
  const decimals = measured === null ? DOCUMENTED_DECIMALS : measured.decimals
  return formatCurrency(movement.assetAmountAtomic, { fromAtomic: 10 ** decimals })
}

export default async function Page({ params }: PageProps) {
  const { vaultId } = await params
  const session = await requireSession()
  const { registry, vault } = await loadVault(vaultId as VaultId, session.name)

  if (vault === null) notFound()

  const scopedMovements = mapAvailability(registry.movements, (list) =>
    list.filter((movement) => movement.vaultId === vault.id),
  )
  const scopedRebalancing = mapAvailability(registry.rebalancing, (rows) =>
    rows.filter((row) => row.vaultId === vault.id),
  )

  const ledgerIsEmptyForThisVault =
    isAvailable(registry.movements) &&
    isAvailable(scopedMovements) &&
    registry.movements.value.length > 0 &&
    scopedMovements.value.length === 0

  const activeStatus = editorial(libelleStatutVault(vault.status))
  const aum = amountOf(vault, vault.totalAssetsAtomic)
  const deployedValue = amountOf(vault, deployedAtomic(vault))
  const availableValue = amountOf(vault, idleAtomic(vault))
  const client = vault.client

  const rebalancingList = isAvailable(scopedRebalancing) ? scopedRebalancing.value : null
  const movementList = isAvailable(scopedMovements) ? scopedMovements.value.slice(0, 12) : null

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'status', title: 'Status', value: activeStatus, icon: ShieldCheckIcon },
    { id: 'aum', title: 'AUM', value: aum, icon: BanknotesIcon },
    { id: 'deployed', title: 'Deployed', value: deployedValue, icon: ArrowTrendingUpIcon },
    { id: 'available', title: 'Available', value: availableValue, icon: ArchiveBoxIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader title={vault.label} description="Capital, allocation, and recent activity." kpis={kpis} />

      <div className="flex flex-wrap items-center gap-3">
        <VaultStatusBadge status={vault.status} />
        {isAvailable(client) ? (
          <VaultEntityLink kind="client" id={client.value.id} label={client.value.label} />
        ) : (
          <AdminReading
            value={absentReading(client)}
            emptyLabel={
              client.reason === 'vault_owner_not_reported' ? 'Owner not reported on vault' : 'Unavailable'
            }
          />
        )}
      </div>

      {!isAvailable(scopedRebalancing) ? (
        <>
          <ChartFrame
            question="How is exposure distributed by pocket?"
            unite="in percent — target vs exposure"
            etat={{
              type: 'unavailable',
              explication: 'Allocation read did not succeed for this vault.',
            }}
          />
          <SectionCard title="Allocation" hint="Target, exposure, and drift as reported by the service." className="mt-6">
            <Text>
              <AdminReading value={absentReading(scopedRebalancing)} />{' '}
              <Link href={entityHref('source', 'rebalancing-status')}>Data coverage</Link>
            </Text>
          </SectionCard>
        </>
      ) : rebalancingList !== null && rebalancingList.length === 0 ? (
        <>
          <ChartFrame
            question="How is exposure distributed by pocket?"
            unite="in percent — target vs exposure"
            etat={{ type: 'empty', explication: 'No measured pocket for this vault.' }}
          />
          <DataTableShell
            title="Allocation"
            description="Target, exposure, and drift as reported by the service."
            calme="No measured pocket for this vault."
            className="mt-6"
          />
        </>
      ) : rebalancingList !== null ? (
        <>
          <ChartFrame
            question="How is exposure distributed by pocket?"
            unite="in percent — target vs exposure"
            etat={{ type: 'plotted' }}
          >
            <HearstAllocationChart
              postes={rebalancingList.map<PosteAllocation>((row) => ({
                label: row.strategyLabel,
                ciblePct: row.targetBps / 100,
                constatePct: row.actualBps === null ? null : row.actualBps / 100,
              }))}
            />
          </ChartFrame>
          <DataTableShell
            fit
            title="Allocation"
            description="Target, exposure, and drift as reported by the service."
            className="mt-6"
          >
            <TableHead>
              <TableRow>
                <TableHeader className="w-[36%]">Strategy</TableHeader>
                <TableHeader className="w-[16%]">Target</TableHeader>
                <TableHeader className="w-[16%]">Exposure</TableHeader>
                <TableHeader className="w-[16%]">Drift</TableHeader>
                <TableHeader className="w-[16%]">Rebalance</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rebalancingList.map((row) => {
                const pocket = pocketOf(row)
                const drift = driftPointsNullable(row.varianceBps)
                return (
                  <TableRow key={row.strategyId}>
                    <TableCell>
                      <VaultEntityLink
                        kind="strategy"
                        id={row.strategyId}
                        label={row.strategyLabel}
                        sub={pocket !== null && pocket !== row.strategyLabel ? pocket : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      {formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {row.actualBps === null
                        ? 'Unavailable'
                        : formatPercent(row.actualBps, { fromBps: true, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="tabular-nums">{drift ?? 'Unavailable'}</TableCell>
                    <TableCell>
                      {isAvailable(row.lastRebalanceAt) && row.lastRebalanceAt.value !== ''
                        ? formatDateTime(row.lastRebalanceAt.value)
                        : 'Unavailable'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </DataTableShell>
        </>
      ) : null}

      {!isAvailable(scopedMovements) ? (
        <SectionCard title="Recent activity">
          <Text>
            Recent activity could not be read.{' '}
            <Link href={entityHref('source', 'data-coverage')}>Data coverage</Link>
          </Text>
        </SectionCard>
      ) : ledgerIsEmptyForThisVault ? (
        <DataTableShell
          title="Recent activity"
          calme="The ledger responded but no movement is attributed to this vault."
        />
      ) : movementList !== null && movementList.length > 0 ? (
        <DataTableShell fit title="Recent activity" count={`${formatNumber(movementList.length)} shown`}>
          <TableHead>
            <TableRow>
              <TableHeader className="w-[22%]">Time</TableHeader>
              <TableHeader className="w-[30%]">Type</TableHeader>
              <TableHeader className="w-[24%]">Amount</TableHeader>
              <TableHeader className="w-[24%]">Tx</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {movementList.map((movement) => {
              const txShort = movement.txHash === null ? null : formatHash(movement.txHash)
              const txUrl = explorerTxUrl(movement.chainId ?? undefined, movement.txHash ?? undefined)
              const clientLabel =
                movement.investorAddress === null
                  ? null
                  : (formatAddress(movement.investorAddress) ?? movement.investorAddress)
              return (
                <TableRow
                  key={movement.id}
                  id={`movement-${movement.id}`}
                  title={clientLabel !== null ? `Client ${clientLabel}` : undefined}
                >
                  <TableCell
                    className="tabular-nums"
                    title={movement.occurredAt === null ? undefined : formatDateTime(movement.occurredAt)}
                  >
                    {movement.occurredAt === null ? 'Unavailable' : formatRelativeTime(movement.occurredAt)}
                  </TableCell>
                  <TableCell className="truncate" title={phraseMouvement(movement.eventName)}>
                    {libelleMouvement(movement.eventName)}
                  </TableCell>
                  <TableCell className="tabular-nums">{movementAmount(movement, vault)}</TableCell>
                  <TableCell className="truncate font-mono text-sm" title={movement.txHash ?? undefined}>
                    {txShort === null ? (
                      'Unavailable'
                    ) : txUrl === null ? (
                      txShort
                    ) : (
                      <a
                        href={txUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent-600 dark:text-accent-400"
                      >
                        {txShort}
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </DataTableShell>
      ) : (
        <DataTableShell title="Recent activity" calme="No indexed movement for this vault." />
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
