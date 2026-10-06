import { DashCard } from '@/components/admin/dashboard'
import { PaginatedTable } from '@/components/admin/paginated-table'
import { Badge } from '@/components/catalyst/badge'
import { TableCell, TableHeader, TableRow } from '@/components/catalyst/table'
import { btcFromSats, usdRound } from '@/lib/admin-dashboard/amounts'
import { DecisionButtons } from '@/features/admin-approvals/decision-buttons'
import {
  driftThresholdOf,
  type AdminApproval,
  type AdminBucketYield,
  type AdminRebalancingOperation,
  type AdminVaultRecord,
} from '@/lib/admin-dashboard/contracts'
import { formatDate, formatHash, formatNumber } from '@/lib/format'

/**
 * L'ALLOCATION D'UN VAULT, EN POINTS — et ses rééquilibrages.
 *
 * Chaque vault a SA cible (ex. 60 / 25 / 15). Mois après mois, les poches
 * s'en écartent : le minage produit, le prix bouge. L'écart se compte en
 * points de pourcentage, poche par poche ; tant qu'il reste dans la bande que
 * le mandat tolère (±5 pt par défaut), on ne touche à rien. Au-delà, on
 * rééquilibre : on déplace du capital d'une poche à l'autre et le vault revient
 * à sa cible — l'écart repart de zéro.
 *
 * En haut, où en est chaque poche aujourd'hui. Dessous, chaque rééquilibrage :
 * l'écart qu'il a corrigé, ce qu'il a déplacé, la répartition rétablie.
 */

const BUCKETS = [
  { key: 'mining' as const, label: 'Mining Alpha', color: '#9eea7a' },
  { key: 'lending' as const, label: 'Bitcoin Lending', color: '#8a8a8a' },
  { key: 'stable' as const, label: 'USDC Yield', color: '#bdbdbd' },
]

const pts = (bps: number) =>
  `${formatNumber(bps / 100, { maximumFractionDigits: 2, signDisplay: 'exceptZero' })} pt`
const pct = (bps: number) => `${formatNumber(bps / 100, { maximumFractionDigits: 1 })} %`

export function AllocationRebalancing({
  vault,
  buckets,
  operations,
  clientName,
  pending = [],
}: Readonly<{
  vault: AdminVaultRecord
  buckets: readonly AdminBucketYield[]
  operations: readonly AdminRebalancingOperation[]
  clientName: string
  /** Les propositions en attente pour CE vault : rééquilibrage, changement de protocole. */
  pending?: readonly AdminApproval[]
}>) {
  const band = driftThresholdOf(vault)
  const total = buckets.reduce((t, b) => t + (b.capitalUsdc ?? 0), 0)
  /* Dérive non lue par la source : on n'affiche ni part réelle ni écart — un
     « 0 pt » laisserait croire à un vault parfaitement à sa cible. */
  const unread = vault.worstDriftBps === null
  const rows = BUCKETS.map((def) => {
    const b = buckets.find((x) => x.bucket === def.label)
    const target = b?.targetBps ?? null
    const current = !unread && b && total > 0 ? Math.round(((b.capitalUsdc ?? 0) / total) * 10_000) : null
    const drift = unread ? null : (b?.driftBps ?? (target !== null && current !== null ? current - target : null))
    return { ...def, target, current, drift, protocol: b?.protocol ?? null, apy: b?.yieldPct ?? null }
  })
  const read = rows.some((r) => r.drift !== null)
  const worst = read ? Math.max(...rows.map((r) => Math.abs(r.drift ?? 0))) : null
  const outside = worst !== null && worst > band
  const last = operations[0]

  return (
    <DashCard
      className="min-w-0"
      eyebrow="Allocation"
      title="Allocation & rebalancing"
      subtitle="Each bucket against this vault’s own target, in points — and every rebalance that brought it back"
    >
      <div className="flex flex-col gap-6">
        {/* L'état en une ligne : la bande du mandat, et ce qu'il faut faire. */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge color={!read ? 'neutral' : outside ? 'amber' : 'lime'}>
            {!read ? 'Drift not read' : outside ? 'Out of band' : 'Within band'}
          </Badge>
          <span className="text-fg-tertiary">
            Band ±{formatNumber(band / 100, { maximumFractionDigits: 1 })} pt
            {worst !== null ? ` · largest drift ${formatNumber(worst / 100, { maximumFractionDigits: 2 })} pt` : ''}
            {last ? ` · last rebalance ${formatDate(last.occurredAt)}` : ' · never rebalanced'}
          </span>
        </div>

        {/* Les propositions qui attendent l'admin : rien ne bouge sans elles. */}
        {pending.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {pending.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ud-radius-sm)] bg-amber-400/[0.06] px-4 py-3 ring-1 ring-amber-400/25"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">
                    {d.kind === 'rebalance' ? 'Rebalance proposed' : 'Protocol change proposed'}
                  </p>
                  <p className="text-xs text-fg-secondary">
                    {d.rebalance
                      ? `Move ${btcFromSats(d.rebalance.btcSats)} (${usdRound(d.rebalance.usd)}) from ${d.rebalance.fromBucket} to ${d.rebalance.toBucket} — back to target`
                      : d.protocol
                        ? `${d.protocol.bucket}: ${d.protocol.fromProtocol} ${formatNumber(d.protocol.fromApyPct, { maximumFractionDigits: 1 })} % → ${d.protocol.toProtocol} ${formatNumber(d.protocol.toApyPct, { maximumFractionDigits: 1 })} % · ${usdRound(d.protocol.amountUsd)} moved`
                        : (d.note ?? '')}
                  </p>
                </div>
                <DecisionButtons id={d.id} action="Approve" />
              </li>
            ))}
          </ul>
        ) : null}

        {/* Un tableau, une ligne par poche : où elle est placée et à quel taux,
            sa cible, sa part réelle, et l'écart en points. La règle va de 0 à
            100 % : la zone claire est la plage autorisée (cible ± bande), le
            trait blanc la cible, le point la part actuelle. Point dans la zone :
            rien à faire. Point dehors : ambre, relié à la zone par l'excédent. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.08em] text-fg-tertiary uppercase">
                <th className="py-2 pr-4 font-medium">Bucket</th>
                <th className="py-2 pr-4 font-medium">Protocol</th>
                <th className="py-2 pr-4 text-right font-medium">Target</th>
                <th className="py-2 pr-4 text-right font-medium">Now</th>
                <th className="py-2 pr-4 font-medium">Now vs allowed range</th>
                <th className="py-2 text-right font-medium">Drift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ud-line)]">
              {rows.map((r) => {
                const over = r.drift !== null && Math.abs(r.drift) > band
                const now = r.current ?? (r.target !== null && r.drift !== null ? r.target + r.drift : null)
                const at = (bps: number) => `${Math.min(100, Math.max(0, bps / 100))}%`
                return (
                  <tr key={r.key}>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2 font-medium text-fg">
                        <span className="size-2 rounded-[3px]" style={{ background: r.color }} aria-hidden="true" />
                        {r.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-fg-secondary">
                      {r.protocol ?? '—'}
                      {r.apy !== null ? (
                        <span className="ml-1.5 text-xs text-fg-tertiary">{formatNumber(r.apy, { maximumFractionDigits: 1 })} %</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-fg-tertiary">{r.target !== null ? pct(r.target) : '—'}</td>
                    <td className="py-3 pr-4 text-right tabular-nums text-fg">{r.current !== null ? pct(r.current) : '—'}</td>
                    <td className="w-[30%] py-3 pr-4">
                      {r.target !== null && now !== null ? (
                        <span className="relative block h-2 rounded-full bg-[var(--ud-inset)]" aria-hidden="true">
                          {/* La plage autorisée : cible ± bande. */}
                          <span
                            className="absolute -inset-y-1 rounded-sm bg-white/[0.12] ring-1 ring-white/20"
                            style={{ left: at(r.target - band), width: `calc(${at(Math.min(10_000, r.target + band))} - ${at(r.target - band)})` }}
                          />
                          {/* Hors plage : l'excédent, de la borne jusqu'au point. */}
                          {over ? (
                            <span
                              className="absolute inset-y-0.5 bg-amber-400/60"
                              style={
                                now > r.target
                                  ? { left: at(r.target + band), width: `calc(${at(now)} - ${at(r.target + band)})` }
                                  : { left: at(now), width: `calc(${at(r.target - band)} - ${at(now)})` }
                              }
                            />
                          ) : null}
                          {/* La cible. */}
                          <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 rounded bg-fg" style={{ left: at(r.target) }} />
                          {/* La part actuelle. */}
                          <span
                            className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-[var(--ud-card)] ${over ? 'bg-amber-400' : 'bg-fg'}`}
                            style={{ left: at(now) }}
                          />
                        </span>
                      ) : (
                        <span className="text-fg-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      <span className={`block font-medium ${over ? 'text-amber-400' : 'text-fg'}`}>{r.drift !== null ? pts(r.drift) : '—'}</span>
                      {r.drift !== null ? (
                        <span className={`block text-xs ${over ? 'text-amber-400/80' : 'text-fg-tertiary'}`}>
                          {over ? 'Out of band' : 'Within band'}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div>
          <p className="mb-3 text-xs text-fg-tertiary">Rebalancing history</p>
          {operations.length === 0 ? (
            <p className="rounded-lg bg-[var(--ud-inset)] px-4 py-6 text-center text-sm text-fg-tertiary">
              This vault has not been rebalanced yet.
            </p>
          ) : (
            <PaginatedTable
              className="[&_table]:w-full [&_table]:min-w-[52rem]"
              noun="rebalances"
              head={
                <TableRow>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Drift before</TableHeader>
                  <TableHeader>Moved</TableHeader>
                  <TableHeader>Allocation after</TableHeader>
                  <TableHeader>Transaction</TableHeader>
                </TableRow>
              }
              rows={operations.map((op) => {
                const d = op.driftBeforeBps
                const sats =
                  op.swaps[0]?.tokenIn === 'WBTC' ? Number(op.swaps[0].amountIn) : Number(op.swaps[0]?.amountOut ?? NaN)
                return (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium text-fg">{formatDate(op.occurredAt)}</TableCell>
                    <TableCell>
                      <div className={`tabular-nums ${op.worstDriftBeforeBps != null && op.worstDriftBeforeBps > band ? 'text-amber-400' : 'text-fg'}`}>
                        {op.worstDriftBeforeBps != null ? `${formatNumber(op.worstDriftBeforeBps / 100, { maximumFractionDigits: 2 })} pt` : '—'}
                      </div>
                      {d ? (
                        <div className="text-[11px] tabular-nums text-fg-tertiary">
                          M {pts(d.mining)} · L {pts(d.lending)} · U {pts(d.stable)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {op.moved ? (
                        <>
                          <div className="text-fg">
                            {op.moved.fromBucket} → {op.moved.toBucket}
                          </div>
                          <div className="text-[11px] tabular-nums text-fg-tertiary">
                            {Number.isFinite(sats) ? `${btcFromSats(sats)} · ` : ''}
                            {usdRound(op.moved.usd)}
                          </div>
                        </>
                      ) : (
                        <span className="text-fg-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-fg-secondary">
                      {op.allocations.map((a) => formatNumber(Number(a) / 100, { maximumFractionDigits: 0 })).join(' / ')} %
                    </TableCell>
                    <TableCell className="text-xs text-fg-tertiary" title={op.txHash}>
                      {formatHash(op.txHash)}
                    </TableCell>
                  </TableRow>
                )
              })}
              exportData={{
                filename: `hearst-rebalancing-${clientName}`,
                title: `Rebalancing history — ${clientName}`,
                columns: [
                  'Date',
                  'Largest drift before (pt)',
                  'Mining drift (pt)',
                  'Lending drift (pt)',
                  'USDC drift (pt)',
                  'From',
                  'To',
                  'Moved (USD)',
                  'Mining after (%)',
                  'Lending after (%)',
                  'USDC after (%)',
                  'Transaction',
                ],
                data: operations.map((op) => [
                  op.occurredAt.slice(0, 10),
                  op.worstDriftBeforeBps != null ? op.worstDriftBeforeBps / 100 : null,
                  op.driftBeforeBps ? op.driftBeforeBps.mining / 100 : null,
                  op.driftBeforeBps ? op.driftBeforeBps.lending / 100 : null,
                  op.driftBeforeBps ? op.driftBeforeBps.stable / 100 : null,
                  op.moved?.fromBucket ?? null,
                  op.moved?.toBucket ?? null,
                  op.moved?.usd ?? null,
                  ...op.allocations.map((a) => Number(a) / 100),
                  op.txHash,
                ]),
              }}
            />
          )}
        </div>
      </div>
    </DashCard>
  )
}
