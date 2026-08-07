import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import {
  Callout,
  DataTableShell,
  SectionCard,
  StatCard,
  StatGrid,
} from '@/components/compositions'
import { VaultEntityLink, entityHref } from '@/components/vaults/vault-entity-link'
import { VaultStatusBadge } from '@/components/vaults/vault-status-badge'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatNumber, formatPercent, formatRelativeTime } from '@/lib/format'
import { etatSourceLisible } from '@/lib/mouvements'
import {
  combine,
  deployedAtomic,
  editorial,
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

export const metadata: Metadata = { title: 'Registre des coffres' }
export const dynamic = 'force-dynamic'

const ZERO = BigInt(0)
const BPS = BigInt(10000)

function assetScale(vault: Vault): number | undefined {
  const asset = valueOf(vault.asset)
  if (asset === null) return undefined
  return 10 ** asset.decimals
}

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
  const clientsCount = measuredCount(registry.clients)
  const deploymentsCount = measuredCount(registry.deployments)
  const complianceCount = measuredCount(registry.compliance)
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

      <StatGrid label="Signaux du registre" columns={4}>
        <StatCard titre="Coffres actifs" valeur={activeVaults} />
        <StatCard titre="Coffres répertoriés" valeur={totalVaults} />
        <StatCard titre="Sources en direct" valeur={liveSources} />
        <StatCard titre="Mouvements indexés" valeur={movements} />
        <StatCard titre="Clients" valeur={clientsCount} />
        <StatCard titre="Déploiements" valeur={deploymentsCount} />
        <StatCard titre="Conformité" valeur={complianceCount} />
        <StatCard titre="Anomalies clients" valeur={exceptions} hint={decisionLabel} />
      </StatGrid>

      {vaultList === null ? (
        <SectionCard
          title="Coffres"
          hint="Lecture du registre coffre et de l’écart d’allocation rapporté par le service."
        >
          <Callout tone="warning" title="Lecture du registre indisponible">
            La lecture du registre n’a pas abouti.{' '}
            <Link href={entityHref('source', 'vault')} className="text-accent-600 dark:text-accent-400">
              Couverture des données
            </Link>
          </Callout>
        </SectionCard>
      ) : vaultList.length === 0 ? (
        <DataTableShell
          title="Coffres"
          description="Lecture du registre coffre et de l’écart d’allocation rapporté par le service."
          calme="Le service a répondu sans coffre dans le registre."
        />
      ) : (
        <DataTableShell
          title="Coffres"
          description="Lecture du registre coffre et de l’écart d’allocation rapporté par le service."
          count={`${formatNumber(vaultList.length)} coffre(s)`}
        >
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
            </TableRow>
          </TableHead>
          <TableBody>
            {vaultList.map((vault) => {
              const client = valueOf(vault.client)
              const strategies = valueOf(vault.strategies)
              const driftBps = valueOf(vault.worstDriftBps)
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
                      <span className="tabular-nums">{driftPoints(driftBps!)}</span>
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
                </TableRow>
              )
            })}
          </TableBody>
        </DataTableShell>
      )}

      {breakdown.kind === 'absent' ? (
        <SectionCard title="Valeur par coffre">
          <Callout tone="warning" title="Lecture des coffres indisponible">
            La lecture des coffres n’a pas abouti.{' '}
            <Link href={entityHref('source', 'vault')}>Couverture des données</Link>
          </Callout>
        </SectionCard>
      ) : breakdown.kind === 'empty' ? (
        <DataTableShell title="Valeur par coffre" calme="Le service a répondu sans coffre." />
      ) : breakdown.ranked.length === 0 ? (
        <SectionCard
          title="Valeur par coffre"
          hint="Le registre liste des coffres, mais aucun ne portait de total lisible."
        >
          {breakdown.unmeasured.map((vault) => (
            <p key={vault.id} className="mt-2">
              {vault.label} —{' '}
              {!isAvailable(vault.totalAssetsAtomic) ? (
                <AdminReading value={absentReading(vault.totalAssetsAtomic)} />
              ) : null}
            </p>
          ))}
        </SectionCard>
      ) : (
        <DataTableShell
          title="Valeur par coffre"
          description={`Total lisible : ${formatCurrency(breakdown.total.toString(), {
            fromAtomic: assetScale(breakdown.ranked[0].vault),
          })}`}
          count={`${formatNumber(breakdown.ranked.length)} coffre(s) mesuré(s)`}
        >
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
        </DataTableShell>
      )}
      {breakdown.kind === 'rows' && breakdown.ranked.length > 0 && breakdown.unmeasured.length > 0 ? (
        <Callout tone="info">
          Exclus du total : {formatNumber(breakdown.unmeasured.length)} coffre(s) illisible(s).
        </Callout>
      ) : null}

      <DataTableShell
        title="Activité des sources"
        count={`${formatNumber(registry.sources.length)} source(s)`}
      >
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
      </DataTableShell>

      <SectionCard title="Contrat de données" eyebrow="Registre">
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
      </SectionCard>
    </div>
  )
}
