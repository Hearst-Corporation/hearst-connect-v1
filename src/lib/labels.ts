/**
 * Shared English labels for business statuses — pure util, no state or I/O.
 *
 * Two families live here: deployment statuses (subscriptions / on-chain
 * requests) and KYC compliance statuses / steps. Several pages import them;
 * named exports must stay STABLE.
 *
 * Two rules, as in `mouvements.ts` (`readableSourceState`):
 *  - KEYS are raw backend codes (identifiers, never UI text) — we map, not translate;
 *  - an UNKNOWN code (present but off-table) renders as-is, lowercased,
 *    never masked as « — »: an unknown state is not an absence. Only a missing
 *    entry (null / empty) renders « — ».
 *
 * This module is a pure util: `import 'server-only'` is not required.
 */

/** Normalize a backend entry into a dictionary key, or '' if empty/missing. */
function key(code: string | null | undefined): string {
  if (typeof code !== 'string') return ''
  return code.trim().toUpperCase()
}

/**
 * Global status of a KYC verification.
 *
 * ⚠️ The EXACT list of codes returned by /api/v1/compliance is to be confirmed
 * on the backend. Plausible UPPERCASE codes are mapped without inventing values:
 * an off-table present code renders as-is (lowercased); « — » is only for a
 * real absence.
 */
const KYC_STATUS: Record<string, string> = {
  PENDING: 'Pending',
  EN_ATTENTE: 'Pending',
  IN_REVIEW: 'In review',
  IN_PROGRESS: 'In review',
  APPROVED: 'Approved',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
  DENIED: 'Rejected',
  EXPIRED: 'Expired',
  HIGH_RISK: 'High risk',
  DONE: 'Completed',
}

export function kycStatusLabel(code: string | null | undefined): string {
  const k = key(code)
  if (k === '') return '—'
  return KYC_STATUS[k] ?? k.toLowerCase()
}

/**
 * Step in a KYC journey (one building block rather than the global verdict).
 *
 * ⚠️ Same caveat: /api/v1/compliance codes are to be confirmed on the backend.
 * Plausible codes mapped without invention; an unknown present code renders
 * as-is (lowercased); « — » only for absence.
 */
const KYC_STEP: Record<string, string> = {
  NOT_STARTED: 'Not started',
  PENDING: 'Pending',
  EN_ATTENTE: 'Pending',
  SUBMITTED: 'Submitted',
  IN_REVIEW: 'In review',
  IN_PROGRESS: 'In progress',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  HIGH_RISK: 'High risk',
  DONE: 'Completed',
}

export function kycStepLabel(code: string | null | undefined): string {
  const k = key(code)
  if (k === '') return '—'
  return KYC_STEP[k] ?? k.toLowerCase()
}
