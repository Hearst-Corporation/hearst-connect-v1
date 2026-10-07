import { AlertsList, type Alert } from './alerts-list'
import { isVaultDrifting, driftThresholdOf } from '@/lib/admin-dashboard/contracts'
import { loadAdminApprovals, loadAdminRecentClients, loadAdminVaultRegistry } from '@/lib/admin-dashboard/load'
import { formatDate } from '@/lib/format'
import { loadIntegrations, loadSettings } from '@/lib/settings/load'
import { isAvailable } from '@/lib/vaults/model'

/**
 * LES ALERTES DU JOUR — ce qui n'est pas une décision, mais qu'on ne doit pas
 * découvrir par hasard : un vault hors de sa bande, un blocage qui arrive à
 * terme, une intégration qui ne répond plus, un réglage en attente, la pause
 * du gardien. Chaque alerte mène à l'écran où l'on agit.
 */

const DAY = 86_400_000

export async function AlertsPanel() {
  const [vaults, settings, integrations, approvals, clients] = await Promise.all([
    loadAdminVaultRegistry(),
    loadSettings(),
    loadIntegrations(),
    loadAdminApprovals(),
    loadAdminRecentClients(100),
  ])
  const alerts: Alert[] = []

  if ((settings?.values.limits as { guardianPause?: boolean } | undefined)?.guardianPause) {
    alerts.push({ kind: 'guardian', tone: 'red', title: 'Guardian pause is ON', detail: 'Every allocation move is frozen', href: '/admin/settings/limits' })
  }
  for (const i of integrations ?? []) {
    if (i.status !== 'connected') {
      alerts.push({ kind: 'integration', tone: 'red', title: `${i.name} is ${i.status.replace('_', ' ')}`, detail: i.role, href: '/admin/settings/integrations' })
    }
  }
  if (integrations === null) {
    alerts.push({ kind: 'integration', tone: 'amber', title: 'Integrations could not be read', detail: 'Their health is unknown', href: '/admin/settings/integrations' })
  }
  if (isAvailable(vaults)) {
    /* Un client à plusieurs tranches : on dit laquelle, sinon « ZAND Bank » apparaît deux fois sans qu'on sache pourquoi. */
    const count = new Map<string, number>()
    for (const v of vaults.value) count.set(v.clientId, (count.get(v.clientId) ?? 0) + 1)
    const nameOf = (v: (typeof vaults.value)[number]) =>
      (count.get(v.clientId) ?? 0) > 1 ? `${v.clientLabel} · Vault ${v.tranche ?? 1}` : v.clientLabel
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && isVaultDrifting(x))) {
      alerts.push({
        kind: 'drift',
        tone: 'amber',
        title: nameOf(v),
        detail: `${((v.worstDriftBps ?? 0) / 100).toFixed(2)} pt vs ±${driftThresholdOf(v) / 100} pt`,
        drift: { pt: Math.abs(v.worstDriftBps ?? 0) / 100, band: driftThresholdOf(v) / 100 },
        href: `/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}&tab=allocation`,
      })
    }
    const soon = Date.now() + 90 * DAY
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && x.lockupEndAt && Date.parse(x.lockupEndAt) <= soon)) {
      const ended = Date.parse(v.lockupEndAt as string) <= Date.now()
      alerts.push({
        kind: 'lockup',
        tone: ended ? 'amber' : 'sky',
        title: `${nameOf(v)} — lockup ${ended ? 'ended' : 'ends soon'}`,
        detail: `${formatDate(v.lockupEndAt)} · release or renew`,
        href: `/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}`,
      })
    }
  }
  /* Les décisions qui attendent depuis plus d'une semaine : un client attend. */
  const stale = (isAvailable(approvals) ? approvals.value : []).filter((a) => a.requestedAt && Date.now() - Date.parse(a.requestedAt) > 7 * DAY)
  if (stale.length > 0) {
    const oldest = Math.max(...stale.map((a) => Math.floor((Date.now() - Date.parse(a.requestedAt as string)) / DAY)))
    alerts.push({
      kind: 'stale',
      tone: 'amber',
      title: `${stale.length} decision${stale.length > 1 ? 's' : ''} waiting more than a week`,
      detail: `Oldest: ${oldest} days — a client is waiting`,
      href: '/admin#decisions',
    })
  }
  /* Un KYC qui n'est pas validé bloque l'appel de fonds : la décision est chez Sumsub, le suivi chez nous. */
  for (const c of (isAvailable(clients) ? clients.value : []).filter((x) => ['PENDING', 'IN_REVIEW', 'REJECTED'].includes(String(x.kycStatus).toUpperCase()))) {
    alerts.push({
      kind: 'kyc',
      tone: String(c.kycStatus).toUpperCase() === 'REJECTED' ? 'red' : 'sky',
      title: `${c.label} — KYC ${String(c.kycStatus).toLowerCase().replace('_', ' ')}`,
      detail: 'With Sumsub — funds cannot be called yet',
      href: `/admin/clients/${c.id}?tab=kyc`,
    })
  }
  const waiting = (settings?.changes ?? []).filter((c) => c.status === 'pending').length
  if (waiting > 0) {
    alerts.push({ kind: 'settings', tone: 'sky', title: `${waiting} settings change${waiting > 1 ? 's' : ''} to approve`, detail: 'Four eyes — another member decides', href: '/admin/settings' })
  }

  const order = { red: 0, amber: 1, sky: 2 }
  return <AlertsList alerts={[...alerts].sort((a, b) => order[a.tone] - order[b.tone])} />
}
