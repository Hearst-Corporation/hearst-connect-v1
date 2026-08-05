import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import type { AdminRegistry } from '@/lib/vaults/model'
import {
  available,
  isAvailable,
  mapAvailability,
  REBALANCING_THRESHOLD_BPS,
  unavailable,
} from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'

function parseCount(value: string): number {
  const digits = value.replaceAll(/[^0-9]/g, '')
  if (digits === '') return 0
  const count = Number.parseInt(digits, 10)
  return Number.isFinite(count) ? count : 0
}

/**
 * Accueil console — Catalyst de base, mêmes lectures que l’ancien plateau.
 * Aucune figure inventée : chaque valeur passe par `estateOverview` / Availability.
 */
export function AdminHomeDashboard({
  registry,
}: Readonly<{ registry: AdminRegistry; user: SessionUser }>) {
  const overview = estateOverview(registry)
  const vaults = registry.vaults
  const thresholdPoints = formatNumber(REBALANCING_THRESHOLD_BPS / 100, { maximumFractionDigits: 2 })

  const pendingDecisions =
    isAvailable(registry.rebalancing) && isAvailable(registry.clientExceptions)
      ? available(
          formatNumber(
            registry.rebalancing.value.filter((row) => row.breached).length +
              registry.clientExceptions.value.length,
          ),
        )
      : isAvailable(registry.clientExceptions)
        ? unavailable({
            endpoint: '/api/v1/vault/strategies',
            status: 'PARTIAL',
            reason: 'rebalancing_unreadable_total_would_be_incomplete',
          })
        : unavailable({ endpoint: '/api/v1/dashboard', reason: 'client_exceptions_unreadable' })

  const decisionHint = !isAvailable(pendingDecisions)
    ? 'File indisponible'
    : parseCount(pendingDecisions.value) > 0
      ? 'À examiner'
      : 'Aucune revue en attente'

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Vue d’ensemble"
        description="Lecture du patrimoine administré à partir des sources exposées par le service — une absence reste une absence."
      />

      <DescriptionList>
        <DescriptionTerm>Coffres actifs</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.activeVaults} />
        </DescriptionDetails>
        <DescriptionTerm>{`Au-dessus du seuil (±${thresholdPoints} pt)`}</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.breachedPockets} />
        </DescriptionDetails>
        <DescriptionTerm>Mouvements récents</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.recentMovements} />
        </DescriptionDetails>
        <DescriptionTerm>Sources en direct</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={mapAvailability(overview.liveSources, (v) => v.replace('/', ' / '))} />
        </DescriptionDetails>
        <DescriptionTerm>Valeur du patrimoine</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.totalValueLocked} />
        </DescriptionDetails>
        <DescriptionTerm>Décisions en attente</DescriptionTerm>
        <DescriptionDetails>
          <span className="inline-flex flex-wrap items-center gap-2">
            <AdminReading value={pendingDecisions} />
            <Badge color="zinc">{decisionHint}</Badge>
          </span>
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Capital"
        description="Dérivé des lectures coffres / stratégies — jamais calculé sur une opérande absente."
      />
      <DescriptionList>
        <DescriptionTerm>Capital déployé</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.deployedCapital} />
        </DescriptionDetails>
        <DescriptionTerm>Capital disponible</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.availableCapital} />
        </DescriptionDetails>
        <DescriptionTerm>Taux de déploiement</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={overview.deploymentRatio} />
        </DescriptionDetails>
        <DescriptionTerm>Rééquilibrage</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={mapAvailability(registry.rebalancing, (rows) => formatNumber(rows.length))} />
        </DescriptionDetails>
        <DescriptionTerm>Dénomination</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading
            value={mapAvailability(
              overview.asset,
              (asset) => `${asset.symbol} · ${formatNumber(asset.decimals)} dp`,
            )}
          />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="Registre des coffres" description="Chaque ligne ouvre la fiche coffre." />
      {isAvailable(vaults) && vaults.value.length > 0 ? (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Coffre</TableHeader>
              <TableHeader>Contrat</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {vaults.value.map((vault) => (
              <TableRow key={vault.id} href={`/admin/vaults/${encodeURIComponent(vault.id)}`}>
                <TableCell className="font-medium">{vault.label}</TableCell>
                <TableCell className="text-zinc-500">
                  {formatAddress(vault.contractAddress) ?? vault.contractAddress}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Text>
          <AdminReading value={mapAvailability(vaults, () => '')} emptyLabel="Aucun coffre lisible" />
          {' · '}
          <Link href="/admin/vaults" className="underline">
            Ouvrir le registre
          </Link>
        </Text>
      )}
    </div>
  )
}
