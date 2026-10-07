import 'server-only'

import type { BackendResolved } from '@/lib/admin-dashboard/cache'
import { callBackend } from '@/lib/backend/client'
import type { AuditEntry, SettingsState } from './schema'

/** Les réglages courants et leurs demandes. `null` : illisibles — rien n'est inventé à la place. */
export async function loadSettings(): Promise<SettingsState | null> {
  try {
    const res = await callBackend<{ settings: BackendResolved<SettingsState> }>('admin-settings')
    return res.ok ? (res.data.settings?.value ?? null) : null
  } catch {
    return null
  }
}

export async function loadAudit(limit = 200): Promise<readonly AuditEntry[] | null> {
  try {
    const res = await callBackend<{ audit: BackendResolved<readonly AuditEntry[]> }>('admin-audit', { params: { limit } })
    const value = res.ok ? res.data.audit?.value : null
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}
