import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
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
  NO_VAULT_ASSIGNED: 'Aucun coffre attribué',
  COMPLIANCE_REVIEW_PENDING: 'Revue de conformité en attente',
  VAULT_INACTIVE: 'Coffre inactif',
  DEPLOYMENT_BLOCKED: 'Déploiement bloqué',
  MISSING_INVESTOR_RECORD: 'Aucun dossier investisseur',
  NO_ACTIVE_STRATEGY: 'Aucune stratégie active',
}

const ISSUE_SENTENCE: Record<ClientIssue, string> = {
  NO_VAULT_ASSIGNED: 'Aucun coffre n’est rattaché à ce client : rien ne peut être déployé pour lui.',
  COMPLIANCE_REVIEW_PENDING: 'Une revue de conformité est ouverte et empêche ce client d’opérer.',
  VAULT_INACTIVE: 'Le coffre rattaché à ce client n’est pas actif sur sa chaîne.',
  DEPLOYMENT_BLOCKED: 'Un déploiement demandé pour ce client n’a pas été confirmé.',
  MISSING_INVESTOR_RECORD: 'Le service ne signale aucun dossier investisseur rattaché à ce compte.',
  NO_ACTIVE_STRATEGY: 'Le coffre rattaché à ce client n’a aucune stratégie mobilisant du capital.',
}

const ABSENCE_SENTENCE: Record<string, string> = {
  no_client_directory_endpoint:
    'L’annuaire client n’est pas exposé par le service : les exceptions clients ne peuvent pas être énumérées.',
}

type PageProps = Readonly<{ params: Promise<{ vaultId: string }> }>

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { vaultId } = await params
  const parsed = parseVaultId(vaultId)
  if (parsed === null) return { title: 'Coffre' }
  const short = formatAddress(parsed.contractAddress)
  return { title: short === null ? 'Coffre' : `Coffre ${short}` }
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

function lastRebalanceReading(vault: Vault): Availability<string> {
  if (!isAvailable(vault.rebalancing)) return absentReading(vault.rebalancing)
  const at = vault.rebalancing.value.lastRebalanceAt
  if (at === null) {
    return unavailable({ endpoint: '/api/v1/rebalancing/status', status: 'EMPTY', reason: null })
  }
  return editorial(`${formatDateTime(at)} · ${formatRelativeTime(at)}`)
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
    ? 'Exceptions clients indisponibles — le service n’a pas énuméré les clients.'
    : `Exceptions clients indisponibles — ${motif}.`
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

  const activeStatus = editorial(vault.status)
  const totalValue = amountOf(vault, vault.totalAssetsAtomic)
  const deployedValue = amountOf(vault, deployedAtomic(vault))
  const idleValue = amountOf(vault, idleAtomic(vault))
  const driftValue = mapAvailability(vault.worstDriftBps, driftPoints)
  const strategiesCount = mapAvailability(vault.strategies, (rows) => formatNumber(rows.length))

  const lastActivity = mapAvailability(
    vault.lastActivityAt,
    (iso) => `${formatDateTime(iso)} · ${formatRelativeTime(iso)}`,
  )
  const address = formatAddress(vault.contractAddress)
  const client = vault.client

  const rebalancingList = isAvailable(scopedRebalancing) ? scopedRebalancing.value : null
  const movementList = isAvailable(scopedMovements) ? scopedMovements.value.slice(0, 12) : null
  const exceptions = registry.clientExceptions

  const strategyIndex = isAvailable(vault.strategies)
    ? indexStrategiePrimaire(vault.strategies.value.length)
    : null
  const strategyDetailRes =
    strategyIndex === null ? null : await loadStrategyDetail(strategyIndex)
  const strategyDetailState = lectureStrategieDetail(strategyIndex, strategyDetailRes)
  const strategyDetailLabel = libelleStrategieDetail(strategyDetailRes)
  const strategyDetailHttp = statutHttpStrategieDetail(strategyDetailRes)

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title={vault.label}
        description={[
          vault.chainId === null ? null : `chain ${vault.chainId}`,
          address ?? vault.contractAddress,
        ]
          .filter((part) => part !== null)
          .join(' · ')}
      />

      <div className="flex flex-wrap items-center gap-3">
        <VaultStatusBadge status={vault.status} />
      </div>

      <DescriptionList>
        <DescriptionTerm>État</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={activeStatus} />
        </DescriptionDetails>
        <DescriptionTerm>Valeur totale</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={totalValue} />
        </DescriptionDetails>
        <DescriptionTerm>Déployé</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={deployedValue} />
        </DescriptionDetails>
        <DescriptionTerm>Disponible (au repos)</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={idleValue} />
        </DescriptionDetails>
        <DescriptionTerm>Poches de stratégie</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={strategiesCount} />
        </DescriptionDetails>
        <DescriptionTerm>Écart courant</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={driftValue} />
        </DescriptionDetails>
        <DescriptionTerm>Dernier rééquilibrage</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={lastRebalanceReading(vault)} />
        </DescriptionDetails>
        <DescriptionTerm>Utilisation</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading
            value={mapAvailability(vault.utilizationBps, (bps) =>
              formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 }),
            )}
          />
        </DescriptionDetails>
        <DescriptionTerm>Plafond TVL</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={amountOf(vault, vault.tvlCapAtomic)} />
        </DescriptionDetails>
        <DescriptionTerm>Capacité restante</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={amountOf(vault, vault.capacityRemainingAtomic)} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="Résumé du coffre" />
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
                  ? 'Propriétaire non reporté sur le coffre'
                  : 'Indisponible'
              }
            />
          )}
        </DescriptionDetails>
        <DescriptionTerm>Créé le</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={CREATED_AT} />
        </DescriptionDetails>
        <DescriptionTerm>Dernière activité</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={lastActivity} />
        </DescriptionDetails>
        <DescriptionTerm>Identifiant</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">{vault.id}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Détail contrat (stratégie index 0)"
        description="Route `strategy-detail` — index primaire = position 0 du registre stratégies (pas un sélecteur multi-index)."
      />
      <DescriptionList>
        <DescriptionTerm>Interrogation HTTP</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={strategyDetailHttp} />
        </DescriptionDetails>
        <DescriptionTerm>État du champ strategy</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={strategyDetailState} />
        </DescriptionDetails>
        <DescriptionTerm>Libellé lu</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={strategyDetailLabel} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Rééquilibrage"
        description="Écart d’allocation par poche, tel que rapporté par le service."
      />
      {!isAvailable(scopedRebalancing) ? (
        <Text>
          <AdminReading value={absentReading(scopedRebalancing)} />
          {' '}
          <Link href={entityHref('source', 'rebalancing-status')}>Couverture des données</Link>
        </Text>
      ) : rebalancingList !== null && rebalancingList.length === 0 ? (
        <Text>Aucune poche mesurée pour ce coffre.</Text>
      ) : rebalancingList !== null ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Stratégie</TableHeader>
              <TableHeader>Cible</TableHeader>
              <TableHeader>Constaté</TableHeader>
              <TableHeader>Écart</TableHeader>
              <TableHeader>Dernier rééquilibrage</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {orderedRebalancing(rebalancingList).map((row) => {
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
                      ? 'Indisponible'
                      : formatPercent(row.actualBps, { fromBps: true, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="tabular-nums">{drift ?? 'Indisponible'}</TableCell>
                  <TableCell>
                    {isAvailable(row.lastRebalanceAt) && row.lastRebalanceAt.value !== ''
                      ? formatDateTime(row.lastRebalanceAt.value)
                      : 'Indisponible'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : null}

      <AdminSectionHeading
        title="Mouvements"
        description="Source series1-events — indexation uniquement."
      />
      {!isAvailable(scopedMovements) ? (
        <Text>
          Le journal des mouvements n’a pas pu être lu.{' '}
          <Link href={entityHref('source', 'data-coverage')}>Couverture des données</Link>
        </Text>
      ) : ledgerIsEmptyForThisVault ? (
        <Text>Le journal a répondu mais aucun mouvement n’est attribué à ce coffre.</Text>
      ) : movementList !== null && movementList.length > 0 ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Heure</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Client</TableHeader>
                <TableHeader>Montant</TableHeader>
                <TableHeader>Transaction</TableHeader>
                <TableHeader>État</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {movementList.map((movement) => {
                const txShort =
                  movement.txHash === null ? null : formatHash(movement.txHash)
                const txUrl = explorerTxUrl(movement.chainId ?? undefined, movement.txHash ?? undefined)
                return (
                  <TableRow key={movement.id} id={`movement-${movement.id}`}>
                    <TableCell title={movement.occurredAt === null ? undefined : formatDateTime(movement.occurredAt)}>
                      {movement.occurredAt === null ? 'Indisponible' : formatRelativeTime(movement.occurredAt)}
                    </TableCell>
                    <TableCell title={phraseMouvement(movement.eventName)}>
                      {libelleMouvement(movement.eventName)}
                    </TableCell>
                    <TableCell>
                      {movement.investorAddress === null ? (
                        'Indisponible'
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
                        'Indisponible'
                      ) : txUrl === null ? (
                        txShort
                      ) : (
                        <a href={txUrl} target="_blank" rel="noopener noreferrer" className="text-accent-600 dark:text-accent-400">
                          {txShort}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      Indexé
                      {movement.indexedAt === null ? null : (
                        <div className="text-xs text-zinc-500" title={formatDateTime(movement.indexedAt)}>
                          {formatRelativeTime(movement.indexedAt)}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Text className="mt-2 text-sm text-zinc-500">
            {formatNumber(movementList.length)} affiché(s) — indexation uniquement.
          </Text>
        </>
      ) : (
        <Text>Aucun mouvement indexé pour ce coffre.</Text>
      )}

      <AdminSectionHeading title="Déploiements" />
      <DescriptionList>
        <DescriptionTerm>Capital déployé</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={amountOf(vault, deployedAtomic(vault))} />
        </DescriptionDetails>
        <DescriptionTerm>Capital au repos</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={amountOf(vault, idleAtomic(vault))} />
        </DescriptionDetails>
      </DescriptionList>
      {!isAvailable(scopedDeployments) ? (
        <Text>
          {scopedDeployments.status === 'NOT_EXPOSED'
            ? 'Le registre des déploiements n’est pas exposé par le service.'
            : scopedDeployments.status === 'EMPTY'
              ? 'Le registre des déploiements est vide côté service.'
              : 'La lecture du registre des déploiements a échoué.'}{' '}
          <Link href={entityHref('source', 'deployments')}>Couverture des données</Link>
        </Text>
      ) : scopedDeployments.value.length === 0 ? (
        <Text>Aucun déploiement enregistré pour ce coffre.</Text>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Référence</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>Montant</TableHeader>
              <TableHeader>État</TableHeader>
              <TableHeader>Demandé</TableHeader>
              <TableHeader>Confirmé</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {scopedDeployments.value.map((deployment) => (
              <TableRow key={deployment.id}>
                <TableCell className="font-mono text-sm">
                  {deployment.reference ?? deployment.id}
                </TableCell>
                <TableCell>
                  <AdminReading
                    value={mapAvailability(deployment.clientLabel, (label) => label)}
                    emptyLabel="Client non reporté"
                  />
                </TableCell>
                <TableCell>
                  {deployment.amountAtomic === null
                    ? '—'
                    : formatCurrency(deployment.amountAtomic, {
                        fromAtomic: 10 ** (isAvailable(vault.asset) ? vault.asset.value.decimals : DOCUMENTED_DECIMALS),
                      })}
                </TableCell>
                <TableCell>{deployment.status}</TableCell>
                <TableCell>{formatDateTime(deployment.requestedAt)}</TableCell>
                <TableCell>{formatDateTime(deployment.confirmedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AdminSectionHeading title="Anomalies clients" />
      {!isAvailable(exceptions) ? (
        <Text>
          {absenceSentence(exceptions)}{' '}
          <Link href={entityHref('source', 'data-coverage')}>Couverture des données</Link>
        </Text>
      ) : exceptions.value.length === 0 ? (
        <Text>
          Le service a énuméré ses clients et aucun n’est en état d’exception.
        </Text>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Client</TableHeader>
              <TableHeader>Problème</TableHeader>
              <TableHeader>Coffre lié</TableHeader>
              <TableHeader>Conformité</TableHeader>
              <TableHeader>Dernière activité</TableHeader>
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
                  <div className="text-xs text-zinc-500">{ISSUE_SENTENCE[row.issue]}</div>
                </TableCell>
                <TableCell>
                  {row.relatedVaultId === null ? (
                    'Non rattaché à un coffre'
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
                  {!isAvailable(row.compliance) ? (
                    'Indisponible'
                  ) : row.compliance.value === '' ? (
                    '—'
                  ) : (
                    row.compliance.value
                  )}
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
        </Table>
      )}

      <AdminSectionHeading title="Activité des sources" />
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>État</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.slice(0, 4).map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell>{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdminSectionHeading title="Utilisateur connecté" />
      <DescriptionList>
        <DescriptionTerm>Nom</DescriptionTerm>
        <DescriptionDetails>{session.name}</DescriptionDetails>
        <DescriptionTerm>Courriel</DescriptionTerm>
        <DescriptionDetails>{session.email}</DescriptionDetails>
        <DescriptionTerm>État du coffre</DescriptionTerm>
        <DescriptionDetails>
          <VaultStatusBadge status={vault.status} />
        </DescriptionDetails>
      </DescriptionList>
    </div>
  )
}
