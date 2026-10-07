import { OnChainVaultSection } from './onchain-vault'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { DashCard, DashboardHeader, DashboardShell, PanelState } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { OperationsIndexerCard } from '@/components/admin/operations-indexer-card'
import { Badge } from '@/components/catalyst/badge'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { tableCol } from '@/components/compositions'
import type { AdminOperationsSurface } from '@/lib/admin-dashboard/contracts'
import { isAdminNotConfigured, loadAdminOperationsSurface, type AdminRebalancingOperation, type AdminRebalancingSummary } from '@/lib/admin-dashboard/load'
import { requireSession } from '@/lib/auth'
import { formatDateTime, formatHash, formatNumber, formatPercent, formatDate } from '@/lib/format'
import { editorial, isAvailable, valueOf, type Availability } from '@/lib/vaults/model'
import { ArrowsRightLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import { VaultWatchlist } from '@/features/admin-dashboard/vault-watchlist'
import { isVaultDrifting, type AdminVaultRecord } from '@/lib/admin-dashboard/contracts'
import { loadAdminApprovals, loadAdminVaultRegistry } from '@/lib/admin-dashboard/load'
import type { Metadata } from 'next'
import { vaultDisplayName } from '@/lib/clients/vaults'

export const metadata: Metadata = { title: 'Operations' }
export const dynamic = 'force-dynamic'

/**
 * Operations — action + decision + execution history, shaped as a cockpit:
 * explicit Bento rows, frozen panel slots, links on the title row.
 * Technical observability lives on /admin/runtime.
 *
 * Supported write: admin indexer trigger only.
 * Low-level rebalance execute is not surfaced — swap body required and the
 * backend does not sign transactions (returns blocked / not implemented).
 */

function attentionCount(summary: AdminRebalancingSummary): number {
  return summary.alerts.length
}

function rebalancingHint(stable: boolean, strategiesOutOfTarget: number): string {
  if (stable) {
    return 'Portfolio within target — no rebalancing action required.'
  }
  const label = strategiesOutOfTarget === 1 ? 'strategy' : 'strategies'
  return `${formatNumber(strategiesOutOfTarget)} ${label} outside target`
}

/**
 * Fixed panel slots (content area, px) — the box is FROZEN whether data is
 * loading, absent, or populated; taller content scrolls inside the box
 * (`scrollbar-none`). Row A is height-matched by construction:
 *   last-rebalance ≈ 126 + indexer ≈ 200 + gap 24 ≈ 350
 *     == rebalancing header 76 + slot 242 + padding 32.
 * Row B's slot is the donut block (220) — the compact charts (176) share the
 * same frozen box, so all three cards settle on the same line.
 */
const PANEL_SLOT_CLASS = {
  rebalancing: 'max-h-[242px] overflow-y-auto scrollbar-none',
  chart: 'max-h-[220px] overflow-y-auto scrollbar-none',
  table: 'max-h-[320px] overflow-y-auto scrollbar-none',
} as const

function LastRebalanceCard({
  snapshot,
}: Readonly<{ snapshot: RebalancingSnapshot }>) {
  return (
    <div data-widget="operations-last-rebalance" className="min-w-0">
      <DashCard title="Last rebalance">
        <p className="text-lg font-semibold text-fg">
          {snapshot.lastRebalance ? formatDate(snapshot.lastRebalance) : '—'}
        </p>
        {snapshot.lastRebalance === null ? null : snapshot.lastRebalanceTxHash ? (
          <p
            className="mt-1.5 truncate font-mono text-xs text-fg-tertiary"
            title={snapshot.lastRebalanceTxHash}
          >
            {formatHash(snapshot.lastRebalanceTxHash)}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-fg-tertiary">No transaction hash reported.</p>
        )}
      </DashCard>
    </div>
  )
}

type RebalancingSnapshot = {
  readonly attention: number | null
  readonly indexerStatus: string | null
  readonly lastRebalance: string | null
  readonly lastRebalanceTxHash: string | null
  readonly strategiesOutOfTarget: number | null
}

function rebalancingSnapshotDe(
  rebalancing: Availability<AdminRebalancingSummary>,
): RebalancingSnapshot {
  if (!isAvailable(rebalancing)) {
    return {
      attention: null,
      indexerStatus: null,
      lastRebalance: null,
      lastRebalanceTxHash: null,
      strategiesOutOfTarget: null,
    }
  }

  const data = rebalancing.value
  return {
    attention: attentionCount(data),
    indexerStatus: data.indexerStatus,
    lastRebalance: data.lastRebalanceAt,
    lastRebalanceTxHash: data.lastRebalanceTxHash,
    strategiesOutOfTarget: data.strategiesOutOfTarget,
  }
}

function RebalanceOperationsCard({
  operations,
  clientOfVault,
}: Readonly<{
  clientOfVault: ReadonlyMap<string, AdminVaultRecord>
  operations: AdminOperationsSurface['rebalancingOperations']
}>) {
  if (!isAvailable(operations) || operations.value.length === 0) {
    return (
      <DashCard
        title="Rebalance operations"
        subtitle="On-chain rebalancing events"
        contentClassName={PANEL_SLOT_CLASS.table}
      >
        {isAdminNotConfigured(operations) || isAvailable(operations) ? (
          <PanelState title="No rebalance operations indexed yet." />
        ) : (
          <PanelState
            title="Rebalance operations could not be read."
            detail={operations.kind === 'unavailable' ? operations.reason ?? 'Source unavailable' : 'Source unavailable'}
          />
        )}
      </DashCard>
    )
  }

  const rows = operations.value

  return (
    <DashCard
      eyebrow="Rebalancing"
      title="Rebalance operations"
      subtitle="Each rebalance moves ONE client vault back to its own target"
      action={<Badge color="neutral">{`${rows.length}`}</Badge>}
    >
      <PaginatedTable
        noun="operations"
        head={
          <TableRow>
            <TableHeader className={tableCol.primary}>Client vault</TableHeader>
            <TableHeader className={tableCol.date}>Occurred</TableHeader>
            <TableHeader className={tableCol.hash}>Tx</TableHeader>
            <TableHeader className={tableCol.numeric}>Block</TableHeader>
            <TableHeader className={tableCol.primary}>Allocations</TableHeader>
            <TableHeader className={tableCol.primary}>Swaps</TableHeader>
          </TableRow>
        }
        rows={rows.map((op: AdminRebalancingOperation) => (
            <TableRow key={op.id}>
              <TableCell className={tableCol.primary}>
                {op.vaultId && clientOfVault.has(op.vaultId) ? (
                  <Link
                    href={`/admin/clients/${clientOfVault.get(op.vaultId)!.clientId}?vault=${encodeURIComponent(op.vaultId)}`}
                    className="font-medium text-fg"
                  >
                    {vaultDisplayName(clientOfVault.get(op.vaultId)!, [...clientOfVault.values()])}
                  </Link>
                ) : (
                  <span className="text-fg-tertiary">Vault not reported</span>
                )}
              </TableCell>
              <TableCell className={`${tableCol.date} text-fg-tertiary`}>
                {formatDateTime(op.occurredAt)}
              </TableCell>
              <TableCell className={`${tableCol.hash} text-xs`} title={op.txHash}>
                {formatHash(op.txHash)}
              </TableCell>
              <TableCell className={tableCol.numeric}>{formatNumber(Number(op.blockNumber))}</TableCell>
              <TableCell className={tableCol.primary}>
                <div className="flex flex-wrap gap-1">
                  {op.allocations.map((a, i) => (
                    <Badge key={i} className="text-xs">
                      {formatPercent(Number(a), { fromBps: true })}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className={tableCol.primary}>
                {op.swaps.length === 0 ? (
                  <Text className="text-xs text-fg-tertiary">No swaps</Text>
                ) : (
                  <ul className="space-y-1">
                    {op.swaps.map((swap, i) => (
                      // Swap amounts are atomics of two different tokens whose
                      // decimals this surface cannot know — the raw values live
                      // on the title, never rendered as a formatted measure.
                      <li key={i} className="text-xs text-fg-tertiary" title={`${swap.tokenIn} → ${swap.tokenOut} · in ${swap.amountIn} / out ${swap.amountOut} (raw atomics)`}>
                        {formatHash(swap.tokenIn)} → {formatHash(swap.tokenOut)}
                      </li>
                    ))}
                  </ul>
                )}
              </TableCell>
            </TableRow>
          ))}
        exportData={{
          filename: 'hearst-rebalance-operations',
          title: 'Rebalance operations',
          columns: ['Client vault', 'Occurred', 'Tx', 'Block', 'Allocations (bps)'],
          data: rows.map((op) => [
            op.vaultId && clientOfVault.has(op.vaultId) ? vaultDisplayName(clientOfVault.get(op.vaultId)!, [...clientOfVault.values()]) : null,
            op.occurredAt,
            op.txHash,
            op.blockNumber,
            op.allocations.join(' / '),
          ]),
        }}
      />
    </DashCard>
  )
}

export default async function Page() {
  await requireSession()
  const [{ rebalancing, rebalancingOperations }, vaultRegistry, approvals] = await Promise.all([
    loadAdminOperationsSurface(),
    loadAdminVaultRegistry(),
    loadAdminApprovals(),
  ])

  const snapshot = rebalancingSnapshotDe(rebalancing)

  /* Tout se lit VAULT PAR VAULT : chaque client a son vault, sa cible et sa
     bande. Plus d'allocation « des stratégies » en moyenne, ni de dérive « du
     portefeuille » — une moyenne de mandats sur mesure ne décrit personne, et
     on ne rééquilibre jamais que le vault de quelqu'un. */
  const registry = valueOf(vaultRegistry) ?? []
  const clientOfVault = new Map(registry.map((v) => [v.vaultId, v]))
  const drifting = registry.filter(isVaultDrifting)
  const worst = [...registry]
    .filter((v) => v.worstDriftBps !== null)
    .sort((x, y) => Math.abs(y.worstDriftBps ?? 0) - Math.abs(x.worstDriftBps ?? 0))[0]
  const ops = isAvailable(rebalancingOperations) ? rebalancingOperations.value : []
  const since = Date.now() - 30 * 86_400_000
  const recentOps = ops.filter((o) => Date.parse(o.occurredAt) >= since).length
  const pendingRebalances = (valueOf(approvals) ?? []).filter((a) => a.kind === 'rebalance' || a.kind === 'protocol')

  const vaultKpis: readonly AdminHeroKpi[] = [
    {
      id: 'off-band',
      title: 'Vaults out of their band',
      value: editorial(`${drifting.length} / ${registry.length}`),
      icon: ExclamationTriangleIcon,
      footnote: drifting.length > 0 ? drifting.map((v) => vaultDisplayName(v, registry)).join(', ') : 'Every vault within its band',
    },
    {
      id: 'worst',
      title: 'Largest drift',
      value: editorial(worst ? `${formatNumber((worst.worstDriftBps ?? 0) / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt` : '—'),
      icon: ArrowsRightLeftIcon,
      footnote: worst ? vaultDisplayName(worst, registry) : null,
    },
    {
      id: 'rebalances',
      title: 'Rebalances, 30 days',
      value: editorial(String(recentOps)),
      icon: ArrowsRightLeftIcon,
      footnote: `${ops.length} indexed in total`,
    },
    {
      /* L'état de l'indexeur a sa carte, plus bas : la tuile dit plutôt ce qui
         attend l'admin — les rééquilibrages proposés à approuver. */
      id: 'to-approve',
      title: 'Changes to approve',
      value: editorial(String(pendingRebalances.length)),
      icon: ExclamationTriangleIcon,
      footnote:
        pendingRebalances.length > 0
          ? `${pendingRebalances.filter((a) => a.kind === 'rebalance').length} rebalance(s) · ${pendingRebalances.filter((a) => a.kind === 'protocol').length} protocol change(s) — on the client pages`
          : 'Nothing waiting',
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Operations"
        description="Rebalancing, vault by vault — each client vault against its own target and band."
        kpis={vaultKpis}
      />

      <BentoGrid>
        <BentoCard span={8} bare>
          <DashCard
            className="min-w-0"
            eyebrow="Drift"
            title="Drift by client vault"
            subtitle="Each vault against the band its own mandate tolerates"
          >
            <VaultWatchlist vaults={vaultRegistry} />
          </DashCard>
        </BentoCard>
        <BentoCard span={4}>
          <div className="flex min-w-0 flex-col gap-6">
            <LastRebalanceCard snapshot={snapshot} />
            <OperationsIndexerCard indexerStatus={snapshot.indexerStatus} />
          </div>
        </BentoCard>
      </BentoGrid>

      <BentoGrid>
        <BentoCard span={12}>
          <RebalanceOperationsCard operations={rebalancingOperations} clientOfVault={clientOfVault} />
        </BentoCard>
      </BentoGrid>

      {/* Le contrat on-chain qui porte tous les vaults clients. */}
      <OnChainVaultSection />
    </DashboardShell>
  )
}
