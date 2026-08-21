import { ChartFrame, HearstLineChart, type LinePoint } from '@/components/charts'
import { ChartPlaceholder } from '@/components/admin/dashboard/charts-panel'
import {
  isAdminNotConfigured,
  type AdminRebalancingHistoryPoint,
} from '@/lib/admin-dashboard/contracts'
import { isAvailable, type Availability } from '@/lib/vaults/model'

/**
 * Rebalancing drift history — shared between /admin (frameless slot inside a
 * DashCard) and /admin/operations (standalone ChartFrame).
 */

const FRAME_QUESTION = 'How has portfolio drift evolved over time?'
const FRAME_UNIT = 'in basis points — 90 days'

type DriftHistory = Availability<readonly AdminRebalancingHistoryPoint[]>

function reasonOf(history: DriftHistory, fallback: string): string {
  return history.kind === 'unavailable' ? (history.reason ?? fallback) : fallback
}

export function RebalancingDriftChart({
  rebalancingHistory,
  framed = false,
}: Readonly<{
  rebalancingHistory: DriftHistory
  /** Standalone ChartFrame presentation (operations) vs frameless DashCard slot (dashboard). */
  framed?: boolean
}>) {
  const points: LinePoint[] = isAvailable(rebalancingHistory)
    ? rebalancingHistory.value.map((p) => ({
        id: p.id,
        label: p.takenAt.slice(0, 10),
        value: p.driftBps,
        detail: p.takenAt,
      }))
    : []

  if (points.length >= 2) {
    if (!framed) {
      return <HearstLineChart points={points} unit="drift (bps)" viewport="compact" />
    }
    return (
      <ChartFrame question={FRAME_QUESTION} unit={FRAME_UNIT} state={{ type: 'plotted' }}>
        <HearstLineChart points={points} unit="drift (bps)" />
      </ChartFrame>
    )
  }

  if (!framed) {
    if (isAdminNotConfigured(rebalancingHistory)) {
      return (
        <ChartPlaceholder
          title="Rebalancing history not configured"
          detail={reasonOf(rebalancingHistory, 'No rebalancing history indexed yet.')}
        />
      )
    }
    if (!isAvailable(rebalancingHistory)) {
      return (
        <ChartPlaceholder
          title="Data unavailable"
          detail={reasonOf(rebalancingHistory, 'Source unavailable')}
        />
      )
    }
    return <ChartPlaceholder title="Rebalancing drift" />
  }

  if (!isAvailable(rebalancingHistory)) {
    return (
      <ChartFrame
        question={FRAME_QUESTION}
        unit={FRAME_UNIT}
        state={{
          type: 'unavailable',
          explanation: `${reasonOf(rebalancingHistory, 'Source unavailable')}. Drift history is read from the backend rebalancing read model — it cannot be reconstructed on the frontend.`,
        }}
      />
    )
  }

  return (
    <ChartFrame
      question={FRAME_QUESTION}
      unit={FRAME_UNIT}
      state={{ type: 'empty', explanation: 'No drift history for this period.' }}
    />
  )
}
