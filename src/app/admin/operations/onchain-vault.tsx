import { DashCard, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { AdminReading } from '@/components/admin/reading'
import { Link } from '@/components/catalyst/link'
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { AdminTable, Callout, DataTableShell, tableCol } from '@/components/compositions'
import { entityHref } from '@/components/vaults/vault-entity-link'
import { requireSession } from '@/lib/auth'
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format'
import {
  available,
  combine,
  deployedAtomic,
  idleAtomic,
  isAvailable,
  unavailable,
  valueOf,
  type Availability,
  type Unavailable,
  type Vault,
} from '@/lib/vaults/model'
import { loadAdminRegistry } from '@/lib/vaults/registry'



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
  // Date ABSOLUE : un relatif se calcule à l'instant du rendu, donc le
  // serveur et le navigateur n'écrivaient pas la même chose et React rejetait
  // l'hydratation de la page entière.
  return available(formatDate(at), {
    provenance: vault.rebalancing.provenance,
    asOf: vault.rebalancing.asOf,
    stale: vault.rebalancing.stale,
  })
}

/** Primary desk: six fields. Chain, strategies, activity live on vault detail. */
function VaultPrimaryRow({ vault }: Readonly<{ vault: Vault }>) {
  const href = entityHref('vault', vault.id)
  const deployedBps = valueOf(vault.deployedBps)

  return (
    <TableRow>
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
      <TableCell className={tableCol.date}>
        <AdminReading compact value={rebalanceLabel(vault)} emptyLabel="Not reported" />
      </TableCell>
      <TableCell className={tableCol.action}>
        <Link href={href} className="ud-detail-btn inline-flex items-center no-underline" aria-label={`Open ${vault.label}`}>
          Open
        </Link>
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
        {/* `div`, pas `p` : `AdminReading` rend un `Text`, c'est-à-dire un
            paragraphe. Un `<p>` dans un `<p>` est un imbriquement interdit —
            le navigateur ferme le premier d'office, l'arbre rendu ne
            correspond plus à celui du serveur et React rejette l'hydratation
            de la page entière. */}
        <div className="mt-3 text-xs text-fg-tertiary">
          Rebalance · <AdminReading compact value={rebalanceLabel(vault)} emptyLabel="Not reported" />
        </div>
      </Link>
    </li>
  )
}


function VaultRegistryBody({ vaultList }: Readonly<{ vaultList: readonly Vault[] }>) {
  return (
    <>
      <div className="hidden min-w-0 lg:block">
        <DashCard
          eyebrow="Chain"
          title="On-chain vault"
          subtitle="The contract that holds every client vault — capital and deployment as read from the chain. Drift is read vault by vault, above"
          action={<PanelHeaderLink href="/admin/runtime">Source health</PanelHeaderLink>}
        >
          <AdminTable className="[&_table]:w-full [&_td]:px-4 [&_th]:px-4 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
            <TableHead>
              <TableRow>
                <TableHeader className={tableCol.primary}>Vault</TableHeader>
                <TableHeader className={tableCol.numeric}>AUM</TableHeader>
                <TableHeader className={tableCol.numeric}>Deployed</TableHeader>
                <TableHeader className={tableCol.numeric}>Available</TableHeader>
                <TableHeader className={tableCol.date}>Last rebalance</TableHeader>
                <TableHeader className={tableCol.action}>
                  <span className="sr-only">Open</span>
                </TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {vaultList.map((vault) => (
                <VaultPrimaryRow key={vault.id} vault={vault} />
              ))}
            </TableBody>
          </AdminTable>
        </DashCard>
      </div>

      <DashCard
        eyebrow="Chain"
        title="On-chain vault"
        subtitle="AUM, deployment and drift as read from the chain."
        className="lg:hidden"
      >
        <ul className="divide-y divide-console-line-soft">
          {vaultList.map((vault) => (
            <VaultMobileCard key={vault.id} vault={vault} />
          ))}
        </ul>
      </DashCard>
    </>
  )
}

function VaultRegistryContent({ vaultList }: Readonly<{ vaultList: readonly Vault[] | null }>) {
  if (vaultList === null) {
    return (
      <BentoGrid>
        <BentoCard span={12}>
          <Callout tone="warning" title="Vault read unavailable">
            The vault read did not succeed.{' '}
            <Link href={entityHref('source', 'vault')} className="text-accent-400">
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
      <BentoCard span={12} bare>
        <VaultRegistryBody vaultList={vaultList} />
      </BentoCard>
    </BentoGrid>
  )
}

/**
 * LE CONTRAT ON-CHAIN qui porte tous les vaults clients — ce qui restait propre
 * à l'ancienne page Vaults. Les vaults eux-mêmes se lisent sur la page Clients
 * (filtre « Active ») et sur chaque fiche client ; le contrat est une donnée
 * d'exploitation, il vit donc ici, à côté des rééquilibrages.
 */
export async function OnChainVaultSection() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)
  return <VaultRegistryContent vaultList={valueOf(registry.vaults)} />
}
