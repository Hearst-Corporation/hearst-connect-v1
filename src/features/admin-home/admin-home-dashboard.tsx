import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Badge } from '@/components/catalyst/badge'
import { Button } from '@/components/catalyst/button'
import { Link } from '@/components/catalyst/link'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import {
  ChartFrame,
  HearstActivityChart,
  type PointActivite,
} from '@/components/charts'
import {
  DashboardGrid,
  KpiGrid,
  ChartGrid,
  DashboardCard,
  DashboardCardHeader,
  StatCard,
  Callout,
  CapitalSplit,
  DeploymentGauge,
  SourceHealthStrip,
} from '@/components/compositions'
import { formatAddress, formatNumber } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import {
  DRIFT_THRESHOLD_BPS,
  buildCockpitDecisionQueue,
  misallocatedCapitalMoney,
  movementsFreshnessLabel,
  netFlowMoney,
  pocketDrifts,
  pocketsBeyondThresholdCount,
  worstEstateDriftBps,
  type CockpitDecision,
} from '@/lib/vaults/cockpit'
import type { AdminRegistry, Availability } from '@/lib/vaults/model'
import { isAvailable, mapAvailability } from '@/lib/vaults/model'
import { estateOverview } from '@/lib/vaults/overview'

const SEVERITY_BADGE: Record<
  CockpitDecision['severity'],
  { color: 'red' | 'amber' | 'zinc'; label: string }
> = {
  critique: { color: 'red', label: 'Critique' },
  important: { color: 'amber', label: 'Important' },
  information: { color: 'zinc', label: 'Information' },
}

function formatSignedBps(bps: number): string {
  return `${bps > 0 ? '+' : ''}${formatNumber(bps)}`
}

function DecisionQueue({
  rows,
}: Readonly<{ rows: Availability<readonly CockpitDecision[]> }>) {
  if (!isAvailable(rows)) {
    return (
      <Text>
        File indisponible —{' '}
        <AdminReading value={mapAvailability(rows, () => '')} emptyLabel="sources absentes" />
      </Text>
    )
  }
  if (rows.value.length === 0) {
    return <Text>Rien à décider — patrimoine dans les tolérances observables.</Text>
  }
  return (
    <ul className="divide-y divide-zinc-950/5 dark:divide-white/10">
      {rows.value.slice(0, 6).map((row) => {
        const badge = SEVERITY_BADGE[row.severity]
        return (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge color={badge.color}>{badge.label}</Badge>
                {row.capitalLabel ? (
                  <span className="text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                    {row.capitalLabel}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium text-zinc-950 dark:text-white">{row.title}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.detail}</p>
            </div>
            <Button outline href={row.actionHref} className="shrink-0">
              {row.actionLabel}
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Cockpit patrimoine — décisionnel.
 * Question : le patrimoine est-il dans les tolérances, et sinon que faire en premier ?
 * Pas de funnel KYC ici (→ `/admin/dashboard`). Aucune série historique inventée.
 */
export function AdminHomeDashboard({
  registry,
}: Readonly<{ registry: AdminRegistry; user: SessionUser }>) {
  const overview = estateOverview(registry)
  const vaults = registry.vaults
  const decisions = buildCockpitDecisionQueue(registry)
  const worstDrift = worstEstateDriftBps(registry)
  const beyond = pocketsBeyondThresholdCount(registry)
  const misalloc = misallocatedCapitalMoney(registry)
  const pockets = pocketDrifts(registry)
  const flow = netFlowMoney(registry.movements, overview.asset)

  const driftHint = !isAvailable(worstDrift)
    ? 'Dérive illisible'
    : !isAvailable(beyond)
      ? formatSignedBps(worstDrift.value) + ' bps'
      : `${formatSignedBps(worstDrift.value)} bps · ${beyond.value} hors ±${DRIFT_THRESHOLD_BPS}`

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
              "Moins de deux points ordonnés : une tendance n'est pas encore lisible.",
          })
        : ({ type: 'tracee' as const })

  const flowNet = isAvailable(flow) ? flow.value.net : null
  const flowUp = flowNet !== null && !flowNet.startsWith('-') && flowNet !== '—'

  return (
    <DashboardGrid>
      <AdminPageHeader
        title="Cockpit"
        description="Le patrimoine est-il dans les tolérances — et sinon, que faire en premier ?"
      />

      <KpiGrid className="lg:grid-cols-5">
        <StatCard titre="Valeur du patrimoine" valeur={overview.totalValueLocked} hint="TVL sous gestion" />
        <StatCard
          titre="Capital déployé"
          valeur={overview.deploymentRatio}
          hint={
            isAvailable(overview.availableCapital)
              ? `disponible ${overview.availableCapital.value}`
              : 'liquidités'
          }
        />
        <StatCard
          titre="Dérive max"
          valeur={mapAvailability(worstDrift, formatSignedBps)}
          hint={driftHint}
          showRoute
        />
        <StatCard
          titre="Capital mal-alloué"
          valeur={misalloc}
          hint={`dérivé · |drift|×actifs / ${formatNumber(10000)}`}
          showRoute
        />
        <StatCard titre="Sources live" valeur={overview.liveSources} hint="couverture des surfaces" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <DashboardCard className="xl:col-span-8">
          <DashboardCardHeader
            title="À décider"
            description="Classé par sévérité puis capital en jeu — chaque ligne porte sa résolution."
            action={
              <Link href="/admin/dashboard" className="text-sm text-accent-700 underline dark:text-accent-400">
                Pilotage souscriptions
              </Link>
            }
          />
          <DecisionQueue rows={decisions} />
        </DashboardCard>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <DeploymentGauge ratioBps={overview.deploymentRatioBps} label="Capital : taux de déploiement" />
          <CapitalSplit deployed={overview.deployedCapital} available={overview.availableCapital} />
        </div>
      </div>

      <ChartGrid>
        <DashboardCard>
          <DashboardCardHeader
            title="Activité & flux net"
            description={movementsFreshnessLabel(registry.movements)}
          />
          {isAvailable(flow) ? (
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 ring-1 ring-zinc-950/5 dark:bg-zinc-800/40 dark:ring-white/10">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Flux net · fenêtre
                </p>
                <p
                  className={
                    flowUp
                      ? 'text-xl font-semibold tabular-nums text-accent-700 dark:text-accent-400'
                      : 'text-xl font-semibold tabular-nums text-danger-600 dark:text-danger-400'
                  }
                >
                  {flow.value.net.startsWith('-') ? flow.value.net : `+${flow.value.net}`}
                </p>
              </div>
              <div className="flex gap-4 text-xs tabular-nums text-zinc-500">
                <span>▲ dépôts {flow.value.deposits}</span>
                <span>▼ rachats {flow.value.redeems}</span>
              </div>
              {flow.value.amountsIncomplete ? (
                <p className="w-full text-xs text-warning-700 dark:text-warning-400">
                  Certains mouvements n’ont pas de montant — somme partielle.
                </p>
              ) : null}
            </div>
          ) : (
            <Text className="mb-4">
              Flux net indisponible · <AdminReading value={mapAvailability(flow, () => '')} />
            </Text>
          )}
          <ChartFrame
            question="À quel rythme le journal enregistre-t-il de l'activité ?"
            unite="volume de mouvements"
            etat={trendEtat}
          >
            {trendPoints.length >= 2 ? (
              <HearstActivityChart points={trendPoints} unite="activité" />
            ) : null}
          </ChartFrame>
        </DashboardCard>

        <DashboardCard>
          <DashboardCardHeader
            title="Dérive des pockets"
            description={`Écart à la cible · seuil ±${DRIFT_THRESHOLD_BPS} bps (convention console)`}
            action={
              <Link href="/admin/operations" className="text-sm underline">
                Rééquilibrage
              </Link>
            }
          />
          {isAvailable(pockets) && pockets.value.length > 0 ? (
            <ul className="space-y-2">
              {pockets.value.slice(0, 8).map((row) => {
                const abs = Math.abs(row.driftBps)
                const width = Math.min(100, Math.round((abs / (DRIFT_THRESHOLD_BPS * 3)) * 100))
                const tone = row.beyondThreshold
                  ? 'bg-danger-500'
                  : 'bg-zinc-400 dark:bg-zinc-500'
                return (
                  <li key={row.strategyId} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-2 text-xs">
                    <span className="truncate text-zinc-600 dark:text-zinc-400">{row.pocketLabel}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
                    </div>
                    <span
                      className={
                        row.beyondThreshold
                          ? 'text-right tabular-nums font-semibold text-danger-600 dark:text-danger-400'
                          : 'text-right tabular-nums text-zinc-700 dark:text-zinc-300'
                      }
                    >
                      {formatSignedBps(row.driftBps)}
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Text>
              <AdminReading value={mapAvailability(pockets, () => '')} emptyLabel="Aucune dérive lisible" />
            </Text>
          )}
          <div className="mt-4">
            <Callout tone="warning" title="Trajectoire 30 jours — indisponible">
              Distinguer une dérive qui converge d’une qui s’emballe exige un historique quotidien.
              Le backend ne stocke aujourd’hui que l’état instantané ci-dessus — aucun control-chart
              n’est simulé.
            </Callout>
          </div>
        </DashboardCard>
      </ChartGrid>

      <SourceHealthStrip
        sources={registry.sources.map((s) => ({
          id: s.endpointId,
          label: s.label,
          status: s.status,
        }))}
      />

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
                <TableHeader>Dérive max</TableHeader>
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
                  <TableCell className="tabular-nums">
                    <AdminReading
                      value={mapAvailability(vault.worstDriftBps, formatSignedBps)}
                      emptyLabel="—"
                    />
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
