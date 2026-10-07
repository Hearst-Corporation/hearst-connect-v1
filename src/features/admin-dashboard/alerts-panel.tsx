import { AlertsList, type Alert } from './alerts-list'
import { isVaultDrifting, driftThresholdOf } from '@/lib/admin-dashboard/contracts'
import { loadAdminVaultRegistry } from '@/lib/admin-dashboard/load'
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
  const [vaults, settings, integrations] = await Promise.all([loadAdminVaultRegistry(), loadSettings(), loadIntegrations()])
  const alerts: Alert[] = []

  if ((settings?.values.limits as { guardianPause?: boolean } | undefined)?.guardianPause) {
    alerts.push({ tone: 'red', title: 'Guardian pause is ON', detail: 'Every allocation move is frozen', href: '/admin/settings/limits' })
  }
  for (const i of integrations ?? []) {
    if (i.status !== 'connected') {
      alerts.push({ tone: 'red', title: `${i.name} is ${i.status.replace('_', ' ')}`, detail: i.role, href: '/admin/settings/integrations' })
    }
  }
  if (integrations === null) {
    alerts.push({ tone: 'amber', title: 'Integrations could not be read', detail: 'Their health is unknown', href: '/admin/settings/integrations' })
  }
  if (isAvailable(vaults)) {
    /* Un client à plusieurs tranches : on dit laquelle, sinon « ZAND Bank » apparaît deux fois sans qu'on sache pourquoi. */
    const count = new Map<string, number>()
    for (const v of vaults.value) count.set(v.clientId, (count.get(v.clientId) ?? 0) + 1)
    const nameOf = (v: (typeof vaults.value)[number]) =>
      (count.get(v.clientId) ?? 0) > 1 ? `${v.clientLabel} · Tranche ${v.tranche ?? 1}` : v.clientLabel
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && isVaultDrifting(x))) {
      alerts.push({
        tone: 'amber',
        title: `${nameOf(v)} out of band`,
        detail: `${((v.worstDriftBps ?? 0) / 100).toFixed(2)} pt vs ±${driftThresholdOf(v) / 100} pt`,
        href: `/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}&tab=allocation`,
      })
    }
    const soon = Date.now() + 90 * DAY
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && x.lockupEndAt && Date.parse(x.lockupEndAt) <= soon)) {
      const ended = Date.parse(v.lockupEndAt as string) <= Date.now()
      alerts.push({
        tone: ended ? 'amber' : 'sky',
        title: `${nameOf(v)} — lockup ${ended ? 'ended' : 'ends soon'}`,
        detail: `${formatDate(v.lockupEndAt)} · release or renew`,
        href: `/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}`,
      })
    }
  }
  const waiting = (settings?.changes ?? []).filter((c) => c.status === 'pending').length
  if (waiting > 0) {
    alerts.push({ tone: 'sky', title: `${waiting} settings change${waiting > 1 ? 's' : ''} to approve`, detail: 'Four eyes — another member decides', href: '/admin/settings' })
  }

  if (alerts.length === 0) {
    return <p className="text-sm text-fg-tertiary">All clear — every vault within its band, every integration answering.</p>
  }
  const order = { red: 0, amber: 1, sky: 2 }
  return <AlertsList alerts={[...alerts].sort((a, b) => order[a.tone] - order[b.tone])} />
}
