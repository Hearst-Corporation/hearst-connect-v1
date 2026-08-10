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
  StatCard,
  StatGrid,
  SectionCard,
  DataTableShell,
  fitTableColCompact,
  fitTableColPrimary,
} from '@/components/compositions'
import { ChartFrame, HearstDonutChart, type DonutSlice } from '@/components/charts'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { callBackend, statusFromMeta } from '@/lib/backend/client'
import { availabilityFromResolved } from '@/lib/backend/availability'
import { readableReason, readableSourceState } from '@/lib/movements'
import { mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'

/**
 * Data coverage — section of `/admin/runtime`.
 *
 * The former dedicated route was removed: this section lives under the Service
 * hub alongside the runtime probes — what the backend actually serves.
 */

type ResolvedField = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

const SURFACE_NAME: Record<string, string> = {
  identity: 'Investor identity',
  position: 'Held position',
  distributions: 'Distributions paid',
  activity: 'Account activity',
  proofs: 'Proof of reserves',
  allocation: 'Portfolio allocation',
  subscription: 'Subscription terms',
  alerts: 'Active alerts',
  capacity: 'Fund capacity',
  reserve: 'Liquidity reserve',
  performance: 'Performance',
  mining: 'Fleet production',
  rebalancing: 'Rebalancing',
  vault: 'Asset vault',
  strategies: 'Active strategies',
  recentEvents: 'Recent movements',
  engine: 'Mining engine',
  aiExperts: 'AI-assisted analysis',
}

const surfaceName = (key: string): string => SURFACE_NAME[key] ?? key

type CoverageTier = 'served' | 'partial' | 'notOpened'

const TIER_TITLE: Record<CoverageTier, string> = {
  served: 'Served',
  partial: 'Partially served',
  notOpened: 'Not opened',
}

const TIER_EXPLANATION: Record<CoverageTier, string> = {
  served: 'These surfaces return a usable value. You can rely on them.',
  partial:
    'These surfaces respond but without a value — the service knows what to return, it simply has nothing to say today.',
  notOpened: 'These surfaces are not open yet. Nothing is expected from them for now.',
}

function tierFromStatus(status: string): CoverageTier {
  if (status === 'LIVE') return 'served'
  if (status === 'PARTIAL' || status === 'STALE' || status === 'SNAPSHOT' || status === 'EMPTY') return 'partial'
  return 'notOpened'
}

const TIER_ORDER: readonly CoverageTier[] = ['served', 'partial', 'notOpened']

type Surface = { readonly key: string; readonly name: string; readonly tier: CoverageTier; readonly reason: string | undefined }
type SourceActivityRow = {
  readonly endpointId: string
  readonly label: string
  readonly status: string
  readonly detail: string | null
}

const countIn = (surfaces: readonly Surface[], tier: CoverageTier): number =>
  surfaces.filter((s) => s.tier === tier).length

function coverageChartState(
  aggregate: Record<string, unknown> | null,
  surfaces: readonly Surface[],
  filledTiers: number,
): SeriesState {
  if (aggregate === null) {
    return { type: 'unavailable', explanation: 'The dashboard endpoint did not respond.' }
  }
  if (surfaces.length === 0) {
    return { type: 'empty', explanation: 'The dashboard exposed no surface.' }
  }
  if (filledTiers < 2) {
    return {
      type: 'empty',
      explanation:
        'Only one tier is filled — the per-surface list remains more readable than a single-slice ring.',
    }
  }
  return { type: 'plotted' }
}

export async function DataCoverageSection({ accountLabel }: Readonly<{ accountLabel: string }>) {
  const response = await callBackend<Record<string, unknown>>('dashboard')
  const registry = await loadAdminRegistry(accountLabel, { movementLimit: MOVEMENT_WINDOW })
  const aggregate = response.ok ? response.data : null

  const surfaces =
    aggregate === null
      ? []
      : Object.entries(aggregate)
          .filter((entry): entry is [string, ResolvedField] => isResolvedField(entry[1]))
          .map(([key, resolved]) => ({
            key,
            name: surfaceName(key),
            tier: tierFromStatus(resolved.status),
            reason: readableReason(resolved.reason),
          }))
  const ordered = TIER_ORDER.flatMap((tier) => surfaces.filter((surface) => surface.tier === tier))

  const coverageUnreadable = unavailable({
    endpoint: '/api/v1/dashboard',
    status: 'UNAVAILABLE',
    reason: 'dashboard_source_unreachable',
  })
  const dashboardEndpoint = '/api/v1/dashboard'
  const dashboardBlock =
    response.ok && aggregate !== null
      ? // No `?? 'LIVE'`: a response without `meta.status` has not declared its
        // freshness — we do not certify it as "live". `UNAVAILABLE` → named
        // absence via `availabilityFromResolved` (same doctrine as statusFromMeta).
        { status: response.meta?.status ?? 'UNAVAILABLE', value: aggregate, reason: null }
      : null
  const dashboardSource = availabilityFromResolved(dashboardBlock, dashboardEndpoint)

  const asCount = (n: number): Availability<string> =>
    aggregate === null ? coverageUnreadable : mapAvailability(dashboardSource, () => String(n))
  const served = countIn(surfaces, 'served')
  const partial = countIn(surfaces, 'partial')
  const notOpened = countIn(surfaces, 'notOpened')
  const servedCell = asCount(served)
  const partialCell = asCount(partial)
  const notOpenedCell = asCount(notOpened)
  const totalCell = asCount(surfaces.length)

  // REAL coverage distribution by tier: each slice is the actual count of the
  // dashboard surfaces in that tier (a grouping of real data, not an invented
  // counter), and the total is the real number of enumerated surfaces. The
  // donut filters out only the slices > 0; we plot it only once at least two
  // tiers are filled, otherwise the table alone stays more honest than a
  // single-slice ring.
  const coverageSlices: readonly DonutSlice[] = [
    { label: TIER_TITLE.served, value: served },
    { label: TIER_TITLE.partial, value: partial },
    { label: TIER_TITLE.notOpened, value: notOpened },
  ]
  const filledTiers = coverageSlices.filter((slice) => slice.value > 0).length
  const coverageCell: Availability<string> =
    aggregate === null || surfaces.length === 0
      ? coverageUnreadable
      : mapAvailability(dashboardSource, () => `${Math.round((served / surfaces.length) * 100)}%`)

  const sourceState: Availability<string> = response.ok
    ? mapAvailability(dashboardSource, () => readableSourceState(statusFromMeta(response.meta)))
    : unavailable({
        endpoint: dashboardEndpoint,
        status: 'UNAVAILABLE',
        reason: 'dashboard_source_unreachable',
      })

  return (
    <div className="space-y-10">
      <SectionCard
        title="Data coverage"
        hint="Which product surfaces are actually served today. States are shown exactly as the backend reports them — most degraded field first."
        tone="plain"
      >
        <StatGrid label="Surface coverage" columns={3}>
          <StatCard title="Served" value={servedCell} showRoute />
          <StatCard title="Partial" value={partialCell} showRoute />
          <StatCard title="Not opened" value={notOpenedCell} showRoute />
          <StatCard title="Total surfaces" value={totalCell} showRoute />
          <StatCard title="Coverage rate" value={coverageCell} showRoute />
          <StatCard title="Source status" value={sourceState} showRoute />
        </StatGrid>
      </SectionCard>

      <ChartFrame
        question="How is coverage distributed by tier?"
        unit="number of surfaces, by tier"
        state={coverageChartState(aggregate, surfaces, filledTiers)}
        expectedSource={['GET /api/v1/dashboard']}
      >
        {aggregate !== null && filledTiers >= 2 ? (
          <HearstDonutChart slices={coverageSlices} unit="surfaces" />
        ) : null}
      </ChartFrame>

      {aggregate === null ? (
        <SectionCard
          title="Surface by surface"
          hint="Eighteen surfaces in one list, ordered by tier. No status is reclassified on the front end."
        >
          <Text>
            The dashboard entry point did not respond. No coverage is inferred.
          </Text>
        </SectionCard>
      ) : (
        <DataTableShell
          title="Surface by surface"
          description="Eighteen surfaces in one list, ordered by tier. No status is reclassified on the front end."
        >
          <TableHead>
            <TableRow>
              <TableHeader className={fitTableColPrimary}>Surface</TableHeader>
              <TableHeader className={fitTableColCompact}>Status</TableHeader>
              <TableHeader className={fitTableColPrimary}>Reason</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordered.map((surface) => (
              <TableRow key={surface.key}>
                <TableCell className="font-medium">{surface.name}</TableCell>
                <TableCell>{TIER_TITLE[surface.tier]}</TableCell>
                <TableCell className="text-fg-tertiary">{surface.reason ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </DataTableShell>
      )}

      <SectionCard title="Tier meanings">
        <DescriptionList>
          {TIER_ORDER.map((tier) => (
            <div key={tier} className="contents">
              <DescriptionTerm>{TIER_TITLE[tier]}</DescriptionTerm>
              <DescriptionDetails>
                {countIn(surfaces, tier)} — {TIER_EXPLANATION[tier]}
              </DescriptionDetails>
            </div>
          ))}
        </DescriptionList>
      </SectionCard>

      <DataTableShell
        title="Source activity"
        description="Backend endpoint status, as reported by the registry."
      >
        <TableHead>
          <TableRow>
            <TableHeader className={fitTableColPrimary}>Source</TableHeader>
            <TableHeader className={fitTableColCompact}>Status</TableHeader>
            <TableHeader className={fitTableColPrimary}>Detail</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.map((source: SourceActivityRow) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{readableSourceState(source.status)}</TableCell>
              <TableCell className="text-fg-tertiary">{source.detail ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  )
}
