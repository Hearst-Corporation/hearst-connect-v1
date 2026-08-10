import { readableSourceState } from '@/lib/movements'
import { displayStatus } from '@/lib/display-status'

type Block<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

function atomicValue(v: string | null | undefined): string | null {
  if (v === null || v === undefined || v === '') return null
  return v
}

/** Status label for a resolved backend field. */
export function resolvedFieldLabel(block: Block<unknown> | null | undefined): string {
  if (block === null || block === undefined) return '—'
  return readableSourceState(displayStatus(block.status))
}

/** Compares the monthly bill between `mining` and `mining/electricity`. */
export function reconcileMonthlyBill(
  aggregate: Block<{ readonly monthlyCost?: string | null }> | undefined,
  dedicated: Block<{ readonly monthlyCost?: string | null }> | undefined,
): string {
  const aggregateCost = aggregate?.value ? atomicValue(aggregate.value.monthlyCost) : null
  const dedicatedCost = dedicated?.value ? atomicValue(dedicated.value.monthlyCost) : null

  if (aggregateCost === null && dedicatedCost === null) {
    return 'No readable monthly bill on either route.'
  }
  if (aggregateCost === null) {
    return 'Only the dedicated route exposes a monthly bill.'
  }
  if (dedicatedCost === null) {
    return 'Only the aggregate exposes a monthly bill.'
  }
  if (aggregateCost === dedicatedCost) {
    return 'Monthly bill matches.'
  }
  return 'Mismatch between aggregate and dedicated route.'
}

/** Compares the hashrate between `mining` and `mining/metrics/onchain`. */
export function reconcileHashrate(
  aggregate: Block<{ readonly reportedHashrateTh?: string | null }> | undefined,
  dedicated: Block<{ readonly reportedHashrateTh?: string | null }> | undefined,
): string {
  const aggregateHashrate = aggregate?.value ? atomicValue(aggregate.value.reportedHashrateTh) : null
  const dedicatedHashrate = dedicated?.value ? atomicValue(dedicated.value.reportedHashrateTh) : null

  if (aggregateHashrate === null && dedicatedHashrate === null) {
    return 'No readable hashrate on either route.'
  }
  if (aggregateHashrate === null) {
    return 'Only the on-chain route exposes hashrate.'
  }
  if (dedicatedHashrate === null) {
    return 'Only the aggregate exposes hashrate.'
  }
  if (aggregateHashrate === dedicatedHashrate) {
    return 'Reported hashrate matches.'
  }
  return 'Mismatch between aggregate and on-chain read.'
}
