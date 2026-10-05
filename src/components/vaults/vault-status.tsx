import type { VaultStatus } from '@/lib/vaults/model'
import { StatusMark, type StatusTone } from '@hearst/ui/status'

/**
 * What the service could establish about a vault: code read (active), no
 * contract at the address, or an answer it could not read.
 */
const STATUS: Record<VaultStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: 'Active', tone: 'active' },
  NO_CODE: { label: 'No contract code', tone: 'inactive' },
  UNREADABLE: { label: 'Unreadable', tone: 'pending' },
}

/** The label for a vault state, on its own — for a KPI or a cell. */
export function libelleStatutVault(status: VaultStatus): string {
  return STATUS[status].label
}

export function VaultStatusMark({ status }: Readonly<{ status: VaultStatus }>) {
  return <StatusMark tone={STATUS[status].tone} label={STATUS[status].label} />
}
