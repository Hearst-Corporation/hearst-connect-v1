import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstAllocationChart, type PosteAllocation } from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { libelleStatutVault, VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { deploymentStatusLabel } from '@/lib/labels'
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
import { etatSourceLisible, libelleMouvement, motifLisible, phraseMouvement } from '@/lib/mouvements'
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
  type ClientException,
  type ClientIssue,
  type Movement,
  type RebalancingRow,
  type Unavailable,
  type Vault,
  type VaultId,
} from '@/lib/vaults/model'
import { loadVault } from '@/lib/vaults/registry'
import {
  indexStrategiePrimaire,
  lectureStrategieDetail,
  libelleStrategieDetail,
  loadStrategyDetail,
  statutHttpStrategieDetail,
} from '@/lib/vaults/strategy-detail'
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
const CREATED_AT: Availability<string> = unavailable({
  status: 'NOT_EXPOSED',
  reason: 'no_creation_timestamp',
  endpoint: '/api/v1/vault',
})

const ISSUE_LABEL: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'No vault assigned',
  COMPLIANCE_REVIEW_PENDING: 'Compliance review pending',
  VAULT_INACTIVE: 'Vault inactive',
  DEPLOYMENT_BLOCKED: 'Deployment blocked',
  MISSING_INVESTOR_RECORD: 'No investor record',
  NO_ACTIVE_STRATEGY: 'No active strategy',
}

const ISSUE_SENTENCE: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'No vault is linked to this client — nothing can be deployed for them.',
  COMPLIANCE_REVIEW_PENDING: 'An open compliance review prevents this client from operating.',
  VAULT_INACTIVE: 'The vault linked to this client is not active on its chain.',
  DEPLOYMENT_BLOCKED: 'A deployment requested for this client was not confirmed.',
  MISSING_INVESTOR_RECORD: 'The service reports no investor record linked to this account.',
  NO_ACTIVE_STRATEGY: 'The vault linked to this client has no strategy deploying capital.',
}

const ABSENCE_SENTENCE: Record<string, string> = {
  no_client_directory_endpoint:
    'The client directory is not exposed by the service — client exceptions cannot be listed.',
}

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

function severity(row: RebalancingRow): number {
  if (row.varianceBps === null) return 1
  return 0
}

function orderedRebalancing(rows: readonly RebalancingRow[]): readonly RebalancingRow[] {
  return [...rows].sort((a, b) => {
    const bySeverity = severity(a) - severity(b)
    if (bySeverity !== 0) return bySeverity
    if (a.varianceBps !== null && b.varianceBps !== null) {
      const byMagnitude = Math.abs(b.varianceBps) - Math.abs(a.varianceBps)
      if (byMagnitude !== 0) return byMagnitude
    }
    return a.strategyId.localeCompare(b.strategyId)
  })
}

function vaultShortLabel(id: VaultId): string {
  const parsed = parseVaultId(id)
  if (parsed === null) return id
  return formatAddress(parsed.contractAddress) ?? id
}

function absenceSentence(state: Unavailable): string {
  const known = state.reason === null ? undefined : ABSENCE_SENTENCE[state.reason]
  if (known !== undefined) return known
  const motif = motifLisible(state.reason)
  return motif === undefined
    ? 'Client exceptions unavailable — the service did not list clients.'
    : `Client exceptions unavailable — ${motif}.`
}

function movementAmount(movement: Movement, vault: Vault | undefined): string {
  if (movement.assetAmountAtomic === null) return '—'
  const measured = vault !== undefined && isAvailable(vault.asset) ? vault.asset.value : null
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
  const scopedDeployments = mapAvailability(registry.deployments, (list) =>
    list.filter((deployment) => deployment.vaultId === vault.id),
  )

  const ledgerIsEmptyForThisVault =
    isAvailable(registry.movements) &&
    isAvailable(scopedMovements) &&
    registry.movements.value.length > 0 &&
    scopedMovements.value.length === 0

  const activeStatus = editorial(libelleStatutVault(vault.status))
  const totalValue = amountOf(vault, vault.totalAssetsAtomic)
  const deployedValue = amountOf(vault, deployedAtomic(vault))
  const idleValue = amountOf(vault, idleAtomic(vault))

  const lastActivity = mapAvailability(
    vault.lastActivityAt,
    (iso) => `${formatDateTime(iso)} · ${formatRelativeTime(iso)}`,
  )
  const client = vault.client

  const rebalancingList = isAvailable(scopedRebalancing) ? scopedRebalancing.value : null
  const orderedRebalancingList = rebalancingList === null ? null : orderedRebalancing(rebalancingList)
  const movementList = isAvailable(scopedMovements) ? scopedMovements.value.slice(0, 12) : null
  const exceptions = registry.clientExceptions

  const strategyIndex = isAvailable(vault.strategies) ? indexStrategiePrimaire(vault.strategies.value.length) : null
  const strategyDetailRes = strategyIndex === null ? null : await loadStrategyDetail(strategyIndex)
  const strategyDetailState = lectureStrategieDetail(strategyIndex, strategyDetailRes)
  const strategyDetailLabel = libelleStrategieDetail(strategyDetailRes)
  const strategyDetailHttp = statutHttpStrategieDetail(strategyDetailRes)

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'etat', title: 'Status', value: activeStatus, icon: ShieldCheckIcon },
    { id: 'valeur-totale', title: 'Total value', value: totalValue, icon: BanknotesIcon },
    { id: 'deploye', title: 'Deployed', value: deployedValue, icon: ArrowTrendingUpIcon },
    { id: 'disponible', title: 'Idle', value: idleValue, icon: ArchiveBoxIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader title={vault.label} description="Vault read and its attached sources." kpis={kpis} />

      <div className="flex flex-wrap items-center gap-3">
        <VaultStatusBadge status={vault.status} />
      </div>

      {!isAvailable(scopedRebalancing) ? (
        <>
          <ChartFrame
            question="How is allocation distributed by pocket?"
            unite="in percent — target vs observed share"
            etat={{
              type: 'unavailable',
              explication:
                'The rebalancing service did not respond — no allocation to plot for this vault.',
            }}
            expectedSource={['/api/v1/rebalancing/status']}
          />
          <SectionCard title="Rebalancing" hint="Allocation drift by pocket, as reported by the service." className="mt-6">
            <Text>
              <AdminReading value={absentReading(scopedRebalancing)} />{' '}
              <Link href={entityHref('source', 'rebalancing-status')}>Data coverage</Link>
            </Text>
          </SectionCard>
        </>
      ) : rebalancingList !== null && rebalancingList.length === 0 ? (
        <>
          <ChartFrame
            question="How is allocation distributed by pocket?"
            unite="in percent — target vs observed share"
            etat={{ type: 'empty', explication: 'No measured pocket for this vault — no series to plot.' }}
          />
          <DataTableShell
            title="Rebalancing"
            description="Allocation drift by pocket, as reported by the service."
            calme="No measured pocket for this vault."
            className="mt-6"
          />
        </>
      ) : orderedRebalancingList !== null ? (
        <>
          <ChartFrame
            question="How is allocation distributed by pocket?"
            unite="in percent — target vs observed share"
            etat={{ type: 'plotted' }}
          >
            <HearstAllocationChart
              postes={orderedRebalancingList.map<PosteAllocation>((row) => ({
                label: row.strategyLabel,
                ciblePct: row.targetBps / 100,
                constatePct: row.actualBps === null ? null : row.actualBps / 100,
              }))}
            />
          </ChartFrame>
          <DataTableShell
            title="Rebalancing"
            description="Allocation drift by pocket, as reported by the service — the exact figures the chart positions."
            className="mt-6"
          >
            <TableHead>
              <TableRow>
                <TableHeader>Strategy</TableHeader>
                <TableHeader>Target</TableHeader>
                <TableHeader>Observed</TableHeader>
                <TableHeader>Drift</TableHeader>
                <TableHeader>Last rebalance</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {orderedRebalancingList.map((row) => {
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
                    <TableCell>{formatPercent(row.targetBps, { fromBps: true, maximumFractionDigits: 2 })}</TableCell>
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
        <SectionCard title="Movements" hint="Source series1-events — indexing only.">
          <Text>
            The movement ledger could not be read.{' '}
            <Link href={entityHref('source', 'data-coverage')}>Data coverage</Link>
          </Text>
        </SectionCard>
      ) : ledgerIsEmptyForThisVault ? (
        <DataTableShell
          title="Movements"
          description="Source series1-events — indexing only."
          calme="The ledger responded but no movement is attributed to this vault."
        />
      ) : movementList !== null && movementList.length > 0 ? (
        <DataTableShell
          title="Movements"
          description="Source series1-events — indexing only."
          count={`${formatNumber(movementList.length)} shown`}
        >
          <TableHead>
            <TableRow>
              <TableHeader>Time</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Transaction</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {movementList.map((movement) => {
              const txShort = movement.txHash === null ? null : formatHash(movement.txHash)
              const txUrl = explorerTxUrl(movement.chainId ?? undefined, movement.txHash ?? undefined)
              return (
                <TableRow key={movement.id} id={`movement-${movement.id}`}>
                  <TableCell title={movement.occurredAt === null ? undefined : formatDateTime(movement.occurredAt)}>
                    {movement.occurredAt === null ? 'Unavailable' : formatRelativeTime(movement.occurredAt)}
                  </TableCell>
                  <TableCell title={phraseMouvement(movement.eventName)}>
                    {libelleMouvement(movement.eventName)}
                  </TableCell>
                  <TableCell>
                    {movement.investorAddress === null ? (
                      'Unavailable'
                    ) : (
                      <VaultEntityLink
                        kind="client"
                        id={movement.investorAddress}
                        label={formatAddress(movement.investorAddress) ?? movement.investorAddress}
                        className="font-mono"
                      />
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{movementAmount(movement, vault)}</TableCell>
                  <TableCell className="font-mono text-sm">
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
                  <TableCell>
                    Indexed
                    {movement.indexedAt === null ? null : (
                      <div className="text-xs text-fg-tertiary" title={formatDateTime(movement.indexedAt)}>
                        {formatRelativeTime(movement.indexedAt)}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </DataTableShell>
      ) : (
        <DataTableShell
          title="Movements"
          description="Source series1-events — indexing only."
          calme="No indexed movement for this vault."
        />
      )}

      {!isAvailable(scopedDeployments) ? (
        <SectionCard title="Deployment registry">
          <Text>
            {scopedDeployments.status === 'NOT_EXPOSED'
              ? 'The deployment registry is not exposed by the service.'
              : scopedDeployments.status === 'EMPTY'
                ? 'The deployment registry is empty on the service side.'
                : 'The deployment registry read failed.'}{' '}
            <Link href={entityHref('source', 'deployments')}>Data coverage</Link>
          </Text>
        </SectionCard>
      ) : scopedDeployments.value.length === 0 ? (
        <DataTableShell title="Deployment registry" calme="No deployment recorded for this vault." />
      ) : (
        <DataTableShell title="Deployment registry">
          <TableHead>
            <TableRow>
              <TableHeader>Reference</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Requested</TableHeader>
              <TableHeader>Confirmed</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {scopedDeployments.value.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-mono text-sm">{deployment.reference ?? deployment.id}</TableCell>
                <TableCell>
                  <AdminReading
                    value={mapAvailability(deployment.clientLabel, (label) => label)}
                    emptyLabel="Client not reported"
                  />
                </TableCell>
                <TableCell>
                  {deployment.amountAtomic === null
                    ? '—'
                    : formatCurrency(deployment.amountAtomic, {
                        fromAtomic: 10 ** (isAvailable(vault.asset) ? vault.asset.value.decimals : DOCUMENTED_DECIMALS),
                      })}
                </TableCell>
                <TableCell>{deploymentStatusLabel(deployment.status)}</TableCell>
                <TableCell>{formatDateTime(deployment.requestedAt)}</TableCell>
                <TableCell>{formatDateTime(deployment.confirmedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      {!isAvailable(exceptions) ? (
        <SectionCard title="Client anomalies">
          <Callout tone="warning">
            {absenceSentence(exceptions)}{' '}
            <Link href={entityHref('source', 'data-coverage')}>Data coverage</Link>
          </Callout>
        </SectionCard>
      ) : exceptions.value.length === 0 ? (
        <DataTableShell
          title="Client anomalies"
          calme="The service listed its clients and none are in an exception state."
        />
      ) : (
        <DataTableShell title="Client anomalies">
          <TableHead>
            <TableRow>
              <TableHeader>Client</TableHeader>
              <TableHeader>Issue</TableHeader>
              <TableHeader>Linked vault</TableHeader>
              <TableHeader>Compliance</TableHeader>
              <TableHeader>Last activity</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {exceptions.value.map((row: ClientException) => (
              <TableRow key={`${row.clientId ?? row.clientLabel}·${row.issue}`}>
                <TableCell>
                  {row.clientId === null ? (
                    row.clientLabel
                  ) : (
                    <VaultEntityLink kind="client" id={row.clientId} label={row.clientLabel} />
                  )}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{ISSUE_LABEL[row.issue]}</div>
                  <div className="text-xs text-fg-tertiary">{ISSUE_SENTENCE[row.issue]}</div>
                </TableCell>
                <TableCell>
                  {row.relatedVaultId === null ? (
                    'Not linked to a vault'
                  ) : (
                    <VaultEntityLink
                      kind="vault"
                      id={row.relatedVaultId}
                      label={vaultShortLabel(row.relatedVaultId)}
                      className="font-mono"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {!isAvailable(row.compliance)
                    ? 'Unavailable'
                    : row.compliance.value === ''
                      ? '—'
                      : row.compliance.value}
                </TableCell>
                <TableCell>
                  {!isAvailable(row.lastActivityAt) || row.lastActivityAt.value === ''
                    ? '—'
                    : formatRelativeTime(row.lastActivityAt.value)}
                </TableCell>
                <TableCell>
                  <Link href={row.actionHref}>{row.actionLabel}</Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      <SectionCard title="Vault summary" tone="plain">
        <DescriptionList>
          <DescriptionTerm>Client</DescriptionTerm>
          <DescriptionDetails>
            {isAvailable(client) ? (
              <VaultEntityLink kind="client" id={client.value.id} label={client.value.label} />
            ) : (
              <AdminReading
                value={absentReading(client)}
                emptyLabel={
                  client.reason === 'vault_owner_not_reported'
                    ? 'Owner not reported on vault'
                    : 'Unavailable'
                }
              />
            )}
          </DescriptionDetails>
          <DescriptionTerm>Created</DescriptionTerm>
          <DescriptionDetails>
            <AdminReading value={CREATED_AT} />
          </DescriptionDetails>
          <DescriptionTerm>Last activity</DescriptionTerm>
          <DescriptionDetails>
            <AdminReading value={lastActivity} />
          </DescriptionDetails>
          <DescriptionTerm>Identifier</DescriptionTerm>
          <DescriptionDetails className="font-mono text-sm">{vault.id}</DescriptionDetails>
        </DescriptionList>
      </SectionCard>

      <SectionCard
        title="Contract detail (strategy index 0)"
        hint="Route `strategy-detail` — primary index = position 0 in the strategy registry (not a multi-index selector)."
        tone="plain"
      >
        <DescriptionList>
          <DescriptionTerm>HTTP request</DescriptionTerm>
          <DescriptionDetails>
            <AdminReading value={strategyDetailHttp} />
          </DescriptionDetails>
          <DescriptionTerm>Strategy field status</DescriptionTerm>
          <DescriptionDetails>
            <AdminReading value={strategyDetailState} />
          </DescriptionDetails>
          <DescriptionTerm>Read label</DescriptionTerm>
          <DescriptionDetails>
            <AdminReading value={strategyDetailLabel} />
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>

      <DataTableShell title="Source activity" description="The four most recent sources for this vault.">
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>Status</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.slice(0, 4).map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>

      <SectionCard title="Signed-in user">
        <DescriptionList>
          <DescriptionTerm>Name</DescriptionTerm>
          <DescriptionDetails>{session.name}</DescriptionDetails>
          <DescriptionTerm>Email</DescriptionTerm>
          <DescriptionDetails>{session.email}</DescriptionDetails>
          <DescriptionTerm>Vault status</DescriptionTerm>
          <DescriptionDetails>
            <VaultStatusBadge status={vault.status} />
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
