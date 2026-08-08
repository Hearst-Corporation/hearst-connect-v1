import {
  ActionQueue,
  ActivityHeatmap,
  ChartPlaceholder,
  DashCard,
  DashboardHeader,
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
import {
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/16/solid'

const DEPLOY_STEP: Record<string, string> = {
  REQUESTED: 'Requested',
  PENDING: 'In progress',
  CONFIRMED: 'Confirmed',
  FAILED: 'Failed',
}

const DEPLOY_BADGE: Record<string, 'amber' | 'lime' | 'red' | 'zinc'> = {
  REQUESTED: 'amber',
  PENDING: 'amber',
  CONFIRMED: 'lime',
  FAILED: 'red',
}

/**
 * Tableau de bord admin unique — pilotage des souscriptions.
 * Surface canonique : `/admin` (l'ancienne route `/admin/dashboard` redirige).
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
      title: 'Conversion rate',
      value: conversion,
      unit: '% Account → Position',
      icon: ArrowTrendingUpIcon,
    },
    {
      id: 'kyc',
      title: 'KYC pending',
      value: mapAvailability(registry.compliance, (rows) =>
        String(rows.filter((r) => r.stage !== 'termine').length),
      ),
      unit: 'cases',
      icon: ClipboardDocumentCheckIcon,
    },
    {
      id: 'subscriptions',
      title: 'Subscriptions to process',
      value: mapAvailability(registry.deployments, (rows) =>
        String(rows.filter((d) => d.status === 'REQUESTED' || d.status === 'PENDING').length),
      ),
      unit: 'pending',
      icon: BanknotesIcon,
    },
    {
      id: 'failed',
      title: 'Failed subscriptions',
      value: mapAvailability(registry.deployments, (rows) =>
        String(rows.filter((d) => d.status === 'FAILED').length),
      ),
      unit: 'failed',
      icon: ExclamationTriangleIcon,
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
      <DashboardHeader userName={user.name} kpis={kpis} />

      <div className="@container min-w-0">
      <div className="grid grid-cols-1 gap-4 @[56rem]:grid-cols-12">
        <DashCard
          className="@[56rem]:col-span-8"
          title="Subscription journey"
          subtitle="Account → KYC → Wallet → Deposit → Subscription → Position"
        >
          <SubscriptionJourneyStepper steps={funnel} />
        </DashCard>

        <DashCard className="@[56rem]:col-span-4" title="To process" subtitle="Priority actions">
          <ActionQueue rows={priorityQueue} maxRows={6} />
        </DashCard>
      </div>
      </div>

      <div className="@container min-w-0">
      <div className="grid grid-cols-1 gap-4 @[48rem]:grid-cols-12">
        <DashCard
          className="@[48rem]:col-span-7"
          title="Activity curve"
          subtitle="Daily volume · 28 days"
        >
          {showActivityCurve ? (
            <HearstActivityChart points={activityPoints} unite="actions" />
          ) : (
            <ChartPlaceholder title="Activity curve" height={300} icon={ChartBarIcon} />
          )}
        </DashCard>

        <DashCard className="@[48rem]:col-span-5" title="KYC donut" subtitle="Case breakdown">
          {isAvailable(kycBuckets) && kycBuckets.value.length >= 2 ? (
            <HearstDonutChart
              slices={kycBuckets.value.map((b) => ({ label: b.label, value: b.value }))}
              unit="cases"
            />
          ) : (
            <ChartPlaceholder title="KYC donut" height={260} />
          )}
        </DashCard>
      </div>
      </div>

      <div className="@container min-w-0">
      <div className="grid grid-cols-1 gap-4 @[48rem]:grid-cols-12">
        <DashCard
          className="@[48rem]:col-span-7"
          title="Subscriptions by product"
          subtitle="Ranked by volume"
        >
          <ProductBars products={byProduct} />
        </DashCard>

        <DashCard className="@[48rem]:col-span-5" title="Weekly activity" subtitle="Daily density">
          <ActivityHeatmap cells={heatmap} />
        </DashCard>
      </div>
      </div>

      <DashCard title="Latest subscriptions" subtitle="Last six operations">
        {!isAvailable(registry.deployments) ? (
          <Text>Data unavailable</Text>
        ) : recentDeployments.length === 0 ? (
          <Text>No subscriptions</Text>
        ) : (
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Client</TableHeader>
                <TableHeader>Product</TableHeader>
                <TableHeader>Amount</TableHeader>
                <TableHeader>Stage</TableHeader>
                <TableHeader>Wallet</TableHeader>
                <TableHeader>Updated</TableHeader>
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
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DashCard>

      <DashCard title="Source status" subtitle="Operational freshness">
        <SourceStatusGrid sources={registry.sources} />
      </DashCard>
    </DashboardShell>
  )
}
