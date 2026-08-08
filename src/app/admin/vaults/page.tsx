import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
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
import { ChartFrame, HearstDonutChart, RichDistributionChart, type DistributionItem, type DonutSlice } from '@/components/charts'
import { Callout, DataTableShell, SectionCard } from '@/components/compositions'
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
  type Strategy,
  type Vault,
} from '@/lib/vaults/model'
import { activeVaultCount } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import {
  ArchiveBoxIcon,
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  SignalIcon,
} from '@heroicons/react/16/solid'
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

/** Converts strategy allocations to donut slices showing actual dollar value.
 *
 * Uses `assetsAtomic` when the backend publishes a real pocket balance that
 * agrees with the strategy's share. Falls back to `totalAssetsAtomic × bps`
 * only when no real balance is available.
 *
 * The vault may hold multiple assets (USDC + cbBTC). `totalAssetsAtomic`
 * tracks the vault's denomination asset; cbBTC is held off-book and reported
 * via `assetsAtomic` on the cbBTC strategy. A bps-based estimate would
 * misattribute cbBTC value, so `assetsAtomic` is preferred.
 */
function strategySlices(
  strategies: readonly Strategy[],
  totalAssetsAtomic: string | null,
  assetDecimals: number,
): readonly DonutSlice[] {
  const total = totalAssetsAtomic !== null ? Number(totalAssetsAtomic) : null
  const hasTotal = total !== null && Number.isFinite(total) && total > 0

  const scale = 10 ** assetDecimals

  const slices: DonutSlice[] = []
  let deployedAtomic = 0

  for (const s of strategies) {
    // Prefer real pocket balance when available
    const realValue = isAvailable(s.assetsAtomic) ? valueOf(s.assetsAtomic) : null
    if (realValue !== null) {
      const n = Number(realValue)
      if (Number.isFinite(n) && n > 0) {
        slices.push({ label: s.label, value: Math.round(n / scale) })
        deployedAtomic += n
        continue
      }
    }

    // Fallback: estimate from totalAssets × bps (only when total is known)
    if (hasTotal) {
      const bps = s.actualBps ?? s.targetBps ?? 0
      const estimateAtomic = Math.round((total! * bps) / 10_000)
      if (estimateAtomic > 0) {
        slices.push({ label: s.label, value: Math.round(estimateAtomic / scale) })
        deployedAtomic += estimateAtomic
      }
    }
  }

  if (hasTotal) {
    const idle = Math.round((total! - deployedAtomic) / scale)
    if (idle > 0) {
      slices.push({ label: 'Idle / Non déployé', value: idle })
    }
  }

  return slices
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

  const vaultList = valueOf(registry.vaults)
  const breakdown = valueByVaultRows(registry.vaults)

  // Répartition « valeur par coffre » — une distribution triée sur une donnée
  // RÉELLE par ligne (le total lisible de chaque coffre), pas un compteur
  // inventé. On ne trace qu'à partir de deux coffres mesurés qui partagent une
  // même échelle : comparer des montants d'échelles différentes produirait des
  // barres dans aucune unité. En deçà, le tableau seul reste plus honnête.
  const breakdownRows = breakdown.kind === 'rows' ? breakdown.ranked : null
  const comparableScale =
    breakdownRows !== null && breakdownRows.length >= 2
      ? breakdownRows.reduce<number | null | undefined>((scale, { vault }) => {
          if (scale === undefined) return undefined
          const own = assetScale(vault)
          if (own === undefined) return undefined
          if (scale === null) return own
          return scale === own ? scale : undefined
        }, null)
      : undefined
  const valueDistribution: readonly DistributionItem[] =
    breakdownRows !== null && comparableScale !== undefined && comparableScale !== null
      ? breakdownRows.map(({ vault, atomic }) => ({
          label: vault.label,
          value: Number(atomic) / comparableScale,
        }))
      : []

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'active', title: 'Coffres actifs', value: activeVaults, icon: ArchiveBoxIcon },
    { id: 'listed', title: 'Coffres répertoriés', value: totalVaults, icon: BuildingLibraryIcon },
    { id: 'live-sources', title: 'Sources en direct', value: liveSources, icon: SignalIcon },
    { id: 'movements', title: 'Mouvements', value: movements, icon: ArrowsRightLeftIcon },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Registre des coffres"
        description="Lecture du registre coffre et des signaux d’allocation rapportés par le service."
        kpis={kpis}
      />

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
              <TableHeader>cbBTC</TableHeader>
              <TableHeader>Stratégies</TableHeader>
              <TableHeader>Écart d'allocation</TableHeader>
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
                    {(() => {
                      const cbbtcStrategy = strategies?.find(
                        (s) => s.label.toLowerCase().includes('btc') || s.pocket.toLowerCase().includes('btc')
                      )
                      if (!cbbtcStrategy) return <span className="text-zinc-500">—</span>
                      const balance = valueOf(cbbtcStrategy.assetsAtomic)
                      if (balance === null) return <span className="text-zinc-500">—</span>
                      return (
                        <div>
                          <span className="tabular-nums font-medium">{formatNumber(Number(balance) / 1e8, { maximumFractionDigits: 4 })}</span>
                          <span className="text-xs text-zinc-500 ml-1">cbBTC</span>
                        </div>
                      )
                    })()}
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

      {/* ── Répartition des stratégies par coffre ─────────────────────────── */}
      {vaultList !== null && vaultList.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {vaultList.map((vault) => {
            const strategies = valueOf(vault.strategies)
            const hasStrategies = isAvailable(vault.strategies) && strategies !== null && strategies.length > 0
            const totalAssets = valueOf(vault.totalAssetsAtomic)
            const asset = valueOf(vault.asset)
            const assetDecimals = asset?.decimals ?? 6
            const slices = hasStrategies ? strategySlices(strategies, totalAssets, assetDecimals) : []
            const assetSymbol = asset?.symbol ?? ''
            return (
              <ChartFrame
                key={vault.id}
                question={`Répartition des stratégies — ${vault.label}`}
                unite={`valeur en ${assetSymbol}`}
                expectedSource={['GET /api/v1/vault/strategies']}
                etat={
                  hasStrategies
                    ? slices.length > 0
                      ? { type: 'tracee' }
                      : { type: 'vide', explication: 'Les stratégies sont listées mais aucune ne porte d’allocation lisible.' }
                    : { type: 'attendue', explication: 'Aucune stratégie n’a été lue pour ce coffre.' }
                }
              >
                {slices.length > 0 ? (
                  <HearstDonutChart slices={slices} unit={assetSymbol} />
                ) : null}
              </ChartFrame>
            )
          })}
        </div>
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

      <ChartFrame
        question="Comment la valeur se répartit-elle entre les coffres ?"
        unite="valeur lisible, par coffre"
        expectedSource={['GET /api/v1/vault']}
        etat={
          breakdown.kind === 'absent'
            ? { type: 'indisponible', explication: 'La lecture des coffres n’a pas abouti.' }
            : valueDistribution.length >= 2
              ? { type: 'tracee' }
              : {
                  type: 'vide',
                  explication:
                    'La répartition ne se trace qu’à partir de deux coffres mesurés partageant une même dénomination — sinon le tableau reste la lecture la plus honnête.',
                }
        }
      >
        {valueDistribution.length >= 2 ? (
          <RichDistributionChart items={valueDistribution} unit="valeur" />
        ) : null}
      </ChartFrame>

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
