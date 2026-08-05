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
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import {
  REBALANCING_THRESHOLD_BPS,
  combine,
  deployedAtomic,
  editorial,
  idleAtomic,
  isAvailable,
  measuredCount,
  requiresRebalancing,
  unavailable,
  valueOf,
  type Availability,
  type Unavailable,
  type Vault,
} from '@/lib/vaults/model'
import { activeVaultCount } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Registre des coffres' }
export const dynamic = 'force-dynamic'

const THRESHOLD_POINTS = formatNumber(REBALANCING_THRESHOLD_BPS / 100, { maximumFractionDigits: 2 })
const ZERO = BigInt(0)
const BPS = BigInt(10000)

function assetScale(vault: Vault): number | undefined {
  const asset = valueOf(vault.asset)
  if (asset === null) return undefined
  return 10 ** asset.decimals
}

function vaultAmount(vault: Vault, reading: Availability<string | bigint>): Availability<string> {
  return combine(vault.asset, reading, (asset, raw) =>
    formatCurrency(raw.toString(), { unit: asset.symbol, fromAtomic: 10 ** asset.decimals }),
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

function valueByVaultRows(vaults: Availability<readonly Vault[]>) {
  const list = valueOf(vaults)
  if (list === null) return { kind: 'absent' as const, vaults }
  if (list.length === 0) return { kind: 'empty' as const }

  const measured: { vault: Vault; atomic: bigint }[] = []
  const unmeasured: Vault[] = []
  for (const vault of list) {
    const atomic = valueOf(vault.totalAssetsAtomic)
    if (atomic === null) unmeasured.push(vault)
    else measured.push({ vault, atomic: BigInt(atomic) })
  }

  const ranked = [...measured].sort((a, b) => {
    if (a.atomic < b.atomic) return 1
    if (a.atomic > b.atomic) return -1
    return 0
  })
  const total = ranked.reduce((sum, entry) => sum + entry.atomic, ZERO)

  return { kind: 'rows' as const, ranked, unmeasured, total }
}

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)
  const activeVaults = activeVaultCount(registry.vaults)
  const totalVaults = measuredCount(registry.vaults)
  const liveSources = editorial(
    `${registry.sources.filter((source) => source.status === 'LIVE').length} / ${registry.sources.length}`,
  )
  const movements = measuredCount(registry.movements)
  const exceptions = measuredCount(registry.clientExceptions)
  const decisionLabel =
    isAvailable(exceptions) && Number.parseInt(exceptions.value, 10) > 0
      ? 'Revue en attente'
      : 'Aucune revue en attente'

  const vaultList = valueOf(registry.vaults)
  const breakdown = valueByVaultRows(registry.vaults)

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Registre des coffres"
        description="Vue opérationnelle sur les coffres, leurs sources et les signaux du registre — sans décompte de repli quand une source est indisponible."
      />

      <DescriptionList>
        <DescriptionTerm>Coffres actifs</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={activeVaults} />
        </DescriptionDetails>
        <DescriptionTerm>Coffres répertoriés</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={totalVaults} />
        </DescriptionDetails>
        <DescriptionTerm>Sources en direct</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={liveSources} />
        </DescriptionDetails>
        <DescriptionTerm>Mouvements indexés</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={movements} />
        </DescriptionDetails>
        <DescriptionTerm>Anomalies clients</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={exceptions} />
        </DescriptionDetails>
        <DescriptionTerm>État du registre</DescriptionTerm>
        <DescriptionDetails>{decisionLabel}</DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Coffres"
        description={`Seuil de rééquilibrage de cette console : ±${THRESHOLD_POINTS} pt.`}
      />

      {vaultList === null ? (
        <Text>
          La lecture du registre n’a pas abouti.{' '}
          <Link href={entityHref('source', 'vault')} className="text-accent-600 dark:text-accent-400">
            Couverture des données
          </Link>
        </Text>
      ) : vaultList.length === 0 ? (
        <Text>Le service a répondu sans coffre dans le registre.</Text>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Coffre</TableHeader>
              <TableHeader>Client</TableHeader>
              <TableHeader>État</TableHeader>
              <TableHeader>Valeur totale</TableHeader>
              <TableHeader>Déployé</TableHeader>
              <TableHeader>Disponible</TableHeader>
              <TableHeader>Stratégies</TableHeader>
              <TableHeader>Écart d’allocation</TableHeader>
              <TableHeader>Dernier rééquilibrage</TableHeader>
              <TableHeader>Action en attente</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {vaultList.map((vault) => {
              const client = valueOf(vault.client)
              const strategies = valueOf(vault.strategies)
              const driftBps = valueOf(vault.worstDriftBps)
              const breaches = valueOf(requiresRebalancing(vault))
              const actionState = requiresRebalancing(vault)
              const rebalancing = valueOf(vault.rebalancing)
              const deployedBps = valueOf(vault.deployedBps)

              return (
                <TableRow key={vault.id}>
                  <TableCell>
                    <Link href={entityHref('vault', vault.id)} className="font-medium">
                      {vault.label}
                    </Link>
                    <div className="mt-0.5 font-mono text-xs text-zinc-500" title={vault.contractAddress}>
                      {vaultShortAddress(vault)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.client) ? (
                      <AdminReading value={absentReading(vault.client)} />
                    ) : (
                      <VaultEntityLink kind="client" id={client!.id} label={client!.label} />
                    )}
                  </TableCell>
                  <TableCell>
                    <VaultStatusBadge status={vault.status} />
                  </TableCell>
                  <TableCell>
                    <AdminReading value={vaultAmount(vault, vault.totalAssetsAtomic)} />
                  </TableCell>
                  <TableCell>
                    <AdminReading value={vaultAmount(vault, deployedAtomic(vault))} />
                    {deployedBps === null ? null : (
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {formatPercent(deployedBps, { fromBps: true })} du total
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
                      <span
                        className={
                          breaches === true
                            ? 'font-medium text-amber-600 tabular-nums dark:text-amber-400'
                            : 'tabular-nums'
                        }
                      >
                        {driftPoints(driftBps!)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {!isAvailable(vault.rebalancing) ? (
                      <AdminReading value={absentReading(vault.rebalancing)} />
                    ) : rebalancing!.lastRebalanceAt === null ? (
                      <span className="text-zinc-500">Non renseigné</span>
                    ) : (
                      <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                        {formatRelativeTime(rebalancing!.lastRebalanceAt)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {vault.status !== 'ACTIVE' ? (
                      <VaultEntityLink kind="vault" id={vault.id} label="Inspecter le coffre" />
                    ) : !isAvailable(actionState) ? (
                      <AdminReading value={absentReading(actionState)} />
                    ) : breaches ? (
                      <VaultEntityLink kind="keeper" id={vault.id} label="Traiter dans Keeper" />
                    ) : (
                      <span className="text-zinc-500">Aucune</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <AdminSectionHeading title="Valeur par coffre" />
      {breakdown.kind === 'absent' ? (
        <Text>
          La lecture des coffres n’a pas abouti.{' '}
          <Link href={entityHref('source', 'vault')}>Couverture des données</Link>
        </Text>
      ) : breakdown.kind === 'empty' ? (
        <Text>Le service a répondu sans coffre.</Text>
      ) : breakdown.ranked.length === 0 ? (
        <Text>
          Le registre liste des coffres, mais aucun ne portait de total lisible.
          {breakdown.unmeasured.map((vault) => (
            <span key={vault.id} className="mt-2 block">
              {vault.label} —{' '}
              {!isAvailable(vault.totalAssetsAtomic) ? (
                <AdminReading value={absentReading(vault.totalAssetsAtomic)} />
              ) : null}
            </span>
          ))}
        </Text>
      ) : (
        <>
          <DescriptionList className="mb-4">
            <DescriptionTerm>Total lisible</DescriptionTerm>
            <DescriptionDetails>
              {formatCurrency(breakdown.total.toString(), {
                fromAtomic: assetScale(breakdown.ranked[0].vault),
              })}
            </DescriptionDetails>
          </DescriptionList>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Coffre</TableHeader>
                <TableHeader>Valeur</TableHeader>
                <TableHeader>Part du total</TableHeader>
                <TableHeader>État</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {breakdown.ranked.map(({ vault, atomic }) => {
                const percent =
                  breakdown.total > ZERO ? Number((atomic * BPS) / breakdown.total) / 100 : null
                return (
                  <TableRow key={vault.id}>
                    <TableCell>
                      <Link href={entityHref('vault', vault.id)} className="font-medium">
                        {vault.label}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(atomic.toString(), { fromAtomic: assetScale(vault) })}
                    </TableCell>
                    <TableCell>{percent === null ? '—' : formatPercent(percent)}</TableCell>
                    <TableCell>
                      <VaultStatusBadge status={vault.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {breakdown.unmeasured.length > 0 ? (
            <Text className="mt-4">
              Exclus du total : {formatNumber(breakdown.unmeasured.length)} coffre(s) illisible(s).
            </Text>
          ) : null}
        </>
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
          {registry.sources.map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell>{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AdminSectionHeading title="Contrat de données" />
      <DescriptionList>
        <DescriptionTerm>Point d’accès du registre</DescriptionTerm>
        <DescriptionDetails className="font-mono text-sm">GET /api/v1/vault</DescriptionDetails>
        <DescriptionTerm>Seuil</DescriptionTerm>
        <DescriptionDetails>Seuil de la console ±2,00 pt</DescriptionDetails>
        <DescriptionTerm>Navigation</DescriptionTerm>
        <DescriptionDetails>Pages de détail dans `/admin/vaults/{'{vaultId}'}`</DescriptionDetails>
        <DescriptionTerm>Principe</DescriptionTerm>
        <DescriptionDetails>
          Aucun décompte de repli quand une source est indisponible.
        </DescriptionDetails>
      </DescriptionList>
    </div>
  )
}
