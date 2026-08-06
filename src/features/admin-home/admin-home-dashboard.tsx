import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import {
  ChartFrame,
  HearstActivityChart,
  RichDistributionChart,
  type PointActivite,
} from '@/components/charts'
import {
  DashboardGrid,
  KpiGrid,
  ChartGrid,
  DashboardCard,
  DashboardCardHeader,
  StatCard,
} from '@/components/compositions'
import {
  CapitalSplit,
  CoverageRing,
  DeploymentGauge,
  SourceHealthStrip,
} from '@/components/compositions/widgets'
import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import type { AdminRegistry } from '@/lib/vaults/model'
import { isAvailable, mapAvailability } from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'

function parseCount(value: string): number | null {
  const digits = value.replaceAll(/[^0-9]/g, '')
  if (digits === '') return null
  const count = Number.parseInt(digits, 10)
  return Number.isFinite(count) ? count : null
}

/**
 * Dashboard moderne 2026 — Catalyst + compositions + richart.
 * Layout flexible : grid cards, pas de hauteurs fixes.
 * Chaque figure passe par `estateOverview` / Availability : aucune invention.
 */
export function AdminHomeDashboard({
  registry,
}: Readonly<{ registry: AdminRegistry; user: SessionUser }>) {
  const overview = estateOverview(registry)
  const vaults = registry.vaults

  const pendingDecisions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const decisionHint = !isAvailable(pendingDecisions)
    ? 'File indisponible'
    : (() => {
        const count = parseCount(pendingDecisions.value)
        if (count === null) return 'Compte illisible'
        return count > 0 ? 'À examiner' : 'Aucune revue en attente'
      })()

  const trendPoints: PointActivite[] = isAvailable(overview.recentTrend)
    ? overview.recentTrend.value.map((p) => ({
        label: p.label,
        value: p.value,
        detail: p.detail,
      }))
    : []

  const trendEtat =
    !isAvailable(overview.recentTrend)
      ? ({
          type: 'indisponible' as const,
          explication: 'Les mouvements récents ne sont pas lisibles — aucune courbe à tracer.',
        })
      : trendPoints.length < 2
        ? ({
            type: 'attendue' as const,
            explication:
              'Moins de deux points ordonnes : une tendance n\'est pas encore lisible. Les valeurs isolees restent dans le journal.',
          })
        : ({ type: 'tracee' as const })

  const sparkTrend = trendPoints.length >= 2 ? trendPoints.map((p) => p.value) : undefined

  const liveSources = registry.sources.filter((s) => s.status === 'LIVE').length
  const distributionItems = overview.movementBars.map((b) => ({ label: b.label, value: b.value }))

  return (
    <DashboardGrid>
      <AdminPageHeader
        title="Cockpit"
        description="Pilotage en temps réel : patrimoine, activité, onboardings et actions prioritaires."
      />

      {/* KPI Grid — 4 cards responsive */}
      <KpiGrid>
        <StatCard
          titre="Total Value Locked"
          valeur={overview.totalValueLocked}
          hint="Patrimoine total sous gestion"
        />
        <StatCard
          titre="Capital déployé"
          valeur={overview.deployedCapital}
          showRoute
          hint="Positions actives sur le marché"
        />
        <StatCard
          titre="Capital disponible"
          valeur={overview.availableCapital}
          showRoute
          hint="Liquidités disponibles pour déploiement"
        />
        <StatCard
          titre="Mouvements (fenêtre)"
          valeur={overview.recentMovements}
          trend={sparkTrend}
          hint="Activité transactionnelle récente"
        />
      </KpiGrid>

      {/* Secondary KPI Row */}
      <KpiGrid>
        <StatCard
          titre="Clients actifs"
          valeur={mapAvailability(registry.clients, (rows) => formatNumber(rows.length))}
          hint="Portefeuilles suivis"
        />
        <StatCard
          titre="Onboardings en cours"
          valeur={mapAvailability(registry.compliance, (rows) => formatNumber(rows.length))}
          hint="Dossiers en revue de conformité"
        />
        <StatCard
          titre="Déploiements (total)"
          valeur={mapAvailability(registry.deployments, (rows) => formatNumber(rows.length))}
          hint="Stratégies déployées historique"
        />
        <StatCard
          titre="Actions à traiter"
          valeur={pendingDecisions}
          hint={decisionHint}
        />
      </KpiGrid>

      {/* Charts Grid — 2 cols responsive */}
      <ChartGrid>
        <DashboardCard>
          <ChartFrame
            question="À quel rythme le journal enregistre-t-il de l'activité ?"
            unite="volume de mouvements par jour"
            etat={trendEtat}
          >
            {trendPoints.length >= 2 ? (
              <HearstActivityChart points={trendPoints} unite="activité" />
            ) : null}
          </ChartFrame>
        </DashboardCard>

        {distributionItems.length >= 2 && (
          <DashboardCard>
            <ChartFrame
              question="Répartition des types d'opérations"
              unite="compte par type d'événement"
              etat={{ type: 'tracee' }}
            >
              <RichDistributionChart items={distributionItems} unit=" ops" />
            </ChartFrame>
          </DashboardCard>
        )}
      </ChartGrid>

      {/* Widgets Grid — 3 cols responsive */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DeploymentGauge
          ratioBps={overview.deploymentRatioBps}
          label="Capital : taux de déploiement"
        />
        <CapitalSplit
          deployed={overview.deployedCapital}
          available={overview.availableCapital}
        />
        <CoverageRing
          live={liveSources}
          total={registry.sources.length}
          label="Sources backend : couverture"
        />
      </div>

      {/* Sources Health */}
      <SourceHealthStrip
        sources={registry.sources.map((s) => ({
          id: s.endpointId,
          label: s.label,
          status: s.status,
        }))}
      />

      {/* Vaults Table */}
      <DashboardCard>
        <DashboardCardHeader
          title="Registre des coffres"
          description="Chaque ligne ouvre la fiche coffre."
          action={
            <Link href="/admin/vaults" className="text-sm underline">
              Voir tout
            </Link>
          }
        />

        {isAvailable(vaults) && vaults.value.length > 0 ? (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Coffre</TableHeader>
                <TableHeader>Contrat</TableHeader>
                <TableHeader>Statut</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {vaults.value.map((vault) => (
                <TableRow key={vault.id} href={`/admin/vaults/${encodeURIComponent(vault.id)}`}>
                  <TableCell className="font-medium">{vault.label}</TableCell>
                  <TableCell className="font-mono text-sm text-zinc-500">
                    {formatAddress(vault.contractAddress) ?? vault.contractAddress}
                  </TableCell>
                  <TableCell>
                    <Badge color={vault.status === 'ACTIVE' ? 'lime' : 'zinc'}>{vault.status}</Badge>
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
      </DashboardCard>
    </DashboardGrid>
  )
}
