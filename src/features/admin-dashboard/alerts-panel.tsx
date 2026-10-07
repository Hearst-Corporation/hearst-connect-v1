import Link from 'next/link'
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

type Alert = Readonly<{ tone: 'red' | 'amber' | 'sky'; title: string; detail: string; href: string }>

const DOT: Record<Alert['tone'], string> = { red: 'bg-red-400', amber: 'bg-amber-300', sky: 'bg-sky-300' }
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
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && isVaultDrifting(x))) {
      alerts.push({
        tone: 'amber',
        title: `${v.clientLabel} out of band`,
        detail: `${((v.worstDriftBps ?? 0) / 100).toFixed(2)} pt vs ±${driftThresholdOf(v) / 100} pt`,
        href: `/admin/clients/${v.clientId}?vault=${encodeURIComponent(v.vaultId)}&tab=allocation`,
      })
    }
    const soon = Date.now() + 90 * DAY
    for (const v of vaults.value.filter((x) => x.status.toUpperCase() === 'ACTIVE' && x.lockupEndAt && Date.parse(x.lockupEndAt) <= soon)) {
      const ended = Date.parse(v.lockupEndAt as string) <= Date.now()
      alerts.push({
        tone: ended ? 'amber' : 'sky',
        title: `${v.clientLabel} — lockup ${ended ? 'ended' : 'ends soon'}`,
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
  return (
    <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
      {[...alerts]
        .sort((a, b) => order[a.tone] - order[b.tone])
        .slice(0, 8)
        .map((a, i) => (
          <li key={i}>
            <Link href={a.href} className="group flex items-start gap-3 py-2.5 no-underline">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[a.tone]}`} aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm text-fg group-hover:underline">{a.title}</span>
                <span className="truncate text-xs text-fg-tertiary">{a.detail}</span>
              </span>
              <span className="text-sm text-fg-tertiary">→</span>
            </Link>
          </li>
        ))}
    </ul>
  )
}
