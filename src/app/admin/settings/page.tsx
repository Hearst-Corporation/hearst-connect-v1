import { DashCard, DashboardHeader, DashboardShell, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Callout } from '@/components/compositions'
import { ChangeCard } from '@/features/settings/change-card'
import { AuditList } from '@/features/settings/audit-list'
import { requireSession } from '@/lib/auth'
import { loadAudit, loadSettings } from '@/lib/settings/load'
import { sectionOf, type TeamMember } from '@/lib/settings/schema'
import { editorial } from '@/lib/vaults/model'
import { ClockIcon, ShieldCheckIcon, UserGroupIcon, PauseCircleIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/**
 * SETTINGS · OVERVIEW — ce qui attend une décision, puis ce qui vient de changer.
 *
 * La première chose qu'un responsable veut savoir en ouvrant les réglages :
 * y a-t-il un changement à approuver, un autre qui va s'appliquer, et qui a
 * touché à quoi récemment.
 */
export default async function SettingsOverview() {
  const session = await requireSession()
  const [settings, audit] = await Promise.all([loadSettings(), loadAudit(8)])

  if (settings === null) {
    return (
      <DashboardShell>
        <DashboardHeader title="Settings" description="Configure the platform — every change approved by a second member." kpis={[]} />
        <Callout tone="warning" title="Settings could not be read">
          The backend does not publish them yet — nothing is shown rather than a guess.
        </Callout>
      </DashboardShell>
    )
  }

  const team = (settings.values.team ?? []) as TeamMember[]
  const open = settings.changes.filter((c) => c.status === 'pending' || c.status === 'scheduled')
  const pending = open.filter((c) => c.status === 'pending')
  const scheduled = open.filter((c) => c.status === 'scheduled')
  const limits = (settings.values.limits ?? {}) as { guardianPause?: boolean }

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'pending', title: 'Waiting for approval', value: editorial(String(pending.length)), icon: ClockIcon },
    { id: 'scheduled', title: 'Timelock running', value: editorial(String(scheduled.length)), icon: ShieldCheckIcon },
    {
      id: 'team',
      title: 'Active members',
      value: editorial(String(team.filter((m) => m.status === 'active').length)),
      icon: UserGroupIcon,
    },
    { id: 'guardian', title: 'Guardian pause', value: editorial(limits.guardianPause ? 'ON — moves frozen' : 'Off'), icon: PauseCircleIcon },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Settings"
        description="Configure the platform. Every change is a request: a second member approves it, risk parameters wait for their timelock, and all of it is logged."
        kpis={kpis}
      />

      <BentoGrid>
        <BentoCard span={8} bare>
          <DashCard title="Waiting on the team" subtitle="Change requests to approve, and approved ones whose timelock is running">
            {open.length === 0 ? (
              <p className="text-sm text-fg-tertiary">Nothing is waiting. Every setting is as approved.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {open.map((c) => {
                  const section = sectionOf(c.section)
                  if (section === null) return null
                  return (
                    <ChangeCard
                      key={c.id}
                      change={c}
                      section={section}
                      team={team}
                      approverRoles={settings.approverRoles[section.policy] ?? []}
                      me={session.email}
                      compact
                    />
                  )
                })}
              </div>
            )}
          </DashCard>
        </BentoCard>
        <BentoCard span={4} bare>
          <DashCard
            title="Recent activity"
            subtitle="Who changed what — from the audit log"
            action={<PanelHeaderLink href="/admin/settings/audit">Audit log</PanelHeaderLink>}
          >
            <AuditList entries={audit} compact />
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
