import {
  ActionQueue,
  ActivityHeatmap,
  ChartPlaceholder,
  DashCard,
  DashboardHeader,
  DashboardKpiGrid,
  DashboardShell,
  ProductBars,
  SubscriptionJourneyStepper,
  SourceStatusGrid,
  type DashboardKpi,
} from '@/components/admin/dashboard'
import { HearstActivityChart, HearstDonutChart, type PointActivite } from '@/components/charts'
import { Badge } from '@/components/catalyst/badge'
import { Button } from '@/components/catalyst/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { formatRelativeTime } from '@/lib/format'
import type { SessionUser } from '@/lib/session'
import { isAvailable, mapAvailability, combine, measuredCount } from '@/lib/vaults/model'
import {
  buildFunnel,
  buildPriorityQueue,
  kycStatusBuckets,
  movementDailyHeatmap,
  subscriptionsByProduct,
} from '@/lib/vaults/pilotage'
import type { AdminRegistry } from '@/lib/vaults/model'
import { ChartBarIcon } from '@heroicons/react/16/solid'

const DEPLOY_STEP: Record<string, string> = {
  REQUESTED: 'Demandée',
  PENDING: 'En cours',
  CONFIRMED: 'Confirmée',
  FAILED: 'Échouée',
}

const DEPLOY_BADGE: Record<string, 'amber' | 'lime' | 'red' | 'zinc'> = {
  REQUESTED: 'amber',
  PENDING: 'amber',
  CONFIRMED: 'lime',
  FAILED: 'red',
}

/**
 * Tableau de bord admin unique — pilotage des souscriptions.
 * Surface canonique : `/admin` (l’ancienne route `/admin/dashboard` redirige).
 */
export function AdminDashboardPage({
  registry,
  user,
}: Readonly<{ registry: AdminRegistry; user: SessionUser }>) {
  const funnel = buildFunnel(registry)
  const priorityQueue = buildPriorityQueue(registry)

  const positionsActives = mapAvailability(registry.deployments, (rows) =>
    String(rows.filter((d) => d.status === 'CONFIRMED').length),
  )
  const comptes = measuredCount(registry.clients)
  const conversion = combine(comptes, positionsActives, (c, p) => {
    const total = Number.parseInt(c, 10)
    const ok = Number.parseInt(p, 10)
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(ok)) return '—'
    return `${Math.round((ok / total) * 100)}`
  })

  const kpis: readonly DashboardKpi[] = [
    {
      id: 'conversion',
      title: 'Taux de conversion',
      value: conversion,
      unit: '% Compte → Position',
    },
    {
      id: 'kyc',
      title: 'KYC en attente',
      value: mapAvailability(registry.compliance, (rows) =>
        String(rows.filter((r) => r.stage !== 'termine').length),
      ),
      unit: 'dossiers',
    },
    {
      id: 'subscriptions',
      title: 'Souscriptions à traiter',
      value: mapAvailability(registry.deployments, (rows) =>
        String(rows.filter((d) => d.status === 'REQUESTED' || d.status === 'PENDING').length),
      ),
      unit: 'en attente',
    },
    {
      id: 'failed',
      title: 'Souscriptions échouées',
      value: mapAvailability(registry.deployments, (rows) =>
        String(rows.filter((d) => d.status === 'FAILED').length),
      ),
      unit: 'échouées',
    },
  ]

  const kycBuckets = kycStatusBuckets(registry.compliance)
  const byProduct = subscriptionsByProduct(registry.deployments)
  const heatmap = movementDailyHeatmap(registry.movements, 28)

  const activityPoints: PointActivite[] = isAvailable(heatmap)
    ? heatmap.value.map((c) => ({
        label: c.label,
        value: c.count,
        detail: c.day,
      }))
    : []
  const showActivityCurve = activityPoints.length >= 2

  const recentDeployments = isAvailable(registry.deployments)
    ? registry.deployments.value.slice(0, 6)
    : []

  return (
    <DashboardShell>
      <DashboardHeader userName={user.name} />

      <DashboardKpiGrid items={kpis} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <DashCard
          className="xl:col-span-8"
          title="Parcours de souscription"
          subtitle="Compte → KYC → Wallet → Dépôt → Souscription → Position"
        >
          <SubscriptionJourneyStepper steps={funnel} />
        </DashCard>

        <DashCard className="xl:col-span-4" title="À traiter" subtitle="Actions prioritaires">
          <ActionQueue rows={priorityQueue} maxRows={6} />
        </DashCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DashCard
          className="lg:col-span-7"
          title="Courbe d’activité"
          subtitle="Volume journalier · 28 jours"
        >
          {showActivityCurve ? (
            <div className="min-h-[300px]">
              <HearstActivityChart points={activityPoints} unite="actions" />
            </div>
          ) : (
            <ChartPlaceholder title="Courbe d’activité" height={300} icon={ChartBarIcon} />
          )}
        </DashCard>

        <DashCard className="lg:col-span-5" title="Donut KYC" subtitle="Répartition des dossiers">
          {isAvailable(kycBuckets) && kycBuckets.value.length >= 2 ? (
            <HearstDonutChart
              slices={kycBuckets.value.map((b) => ({ label: b.label, value: b.value }))}
              unit="dossiers"
            />
          ) : (
            <ChartPlaceholder title="Donut KYC" height={260} />
          )}
        </DashCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DashCard
          className="lg:col-span-7"
          title="Souscriptions par produit"
          subtitle="Classement par volume"
        >
          <ProductBars products={byProduct} />
        </DashCard>

        <DashCard className="lg:col-span-5" title="Activité hebdomadaire" subtitle="Densité journalière">
          <ActivityHeatmap cells={heatmap} />
        </DashCard>
      </div>

      <DashCard title="Dernières souscriptions" subtitle="Six dernières opérations">
        {!isAvailable(registry.deployments) ? (
          <Text>Données indisponibles</Text>
        ) : recentDeployments.length === 0 ? (
          <Text>Aucune souscription</Text>
        ) : (
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Produit</TableHeader>
                <TableHeader>Montant</TableHeader>
                <TableHeader>Étape</TableHeader>
                <TableHeader>Wallet</TableHeader>
                <TableHeader>Mise à jour</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentDeployments.map((d) => {
                const client =
                  isAvailable(d.clientLabel) && d.clientLabel.value.trim() !== ''
                    ? d.clientLabel.value
                    : '—'
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{client}</TableCell>
                    <TableCell>{d.strategyId ?? '—'}</TableCell>
                    <TableCell className="tabular-nums">{d.amountAtomic ?? '—'}</TableCell>
                    <TableCell>
                      <Badge color={DEPLOY_BADGE[d.status] ?? 'zinc'}>
                        {DEPLOY_STEP[d.status] ?? d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-500">
                      {d.vaultId.length > 14 ? `${d.vaultId.slice(0, 12)}…` : d.vaultId}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {formatRelativeTime(d.confirmedAt ?? d.requestedAt)}
                    </TableCell>
                    <TableCell>
                      <Button plain href={d.vaultId ? `/admin/vaults/${d.vaultId}` : '/admin/vaults'}>
                        Ouvrir
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DashCard>

      <DashCard title="État des sources" subtitle="Fraîcheur opérationnelle">
        <SourceStatusGrid sources={registry.sources} />
      </DashCard>
    </DashboardShell>
  )
}
