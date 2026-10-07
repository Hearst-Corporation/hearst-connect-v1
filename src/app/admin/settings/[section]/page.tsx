import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { Callout } from '@/components/compositions'
import { ChangeCard } from '@/features/settings/change-card'
import { SectionPanel } from '@/features/settings/section-panel'
import { requireSession } from '@/lib/auth'
import { loadSettings } from '@/lib/settings/load'
import { sectionOf, type TeamMember } from '@/lib/settings/schema'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ section: string }> }>): Promise<Metadata> {
  const { section } = await params
  return { title: sectionOf(section)?.title ?? 'Settings' }
}

/**
 * UNE SECTION DE RÉGLAGES — rendue depuis le schéma.
 *
 * En haut, la demande en cours sur cette section (s'il y en a une) : on la
 * décide avant d'en ouvrir une autre. Dessous, les valeurs en vigueur, et
 * « Edit » pour demander un changement. L'historique de la section suit.
 */
export default async function SettingsSectionPage({ params }: Readonly<{ params: Promise<{ section: string }> }>) {
  const session = await requireSession()
  const { section: id } = await params
  const section = sectionOf(id)
  if (section === null) notFound()

  const settings = await loadSettings()
  if (settings === null) {
    return (
      <DashboardShell>
        <DashboardHeader title={section.title} description={section.subtitle} kpis={[]} />
        <Callout tone="warning" title="Settings could not be read">
          The backend does not publish them yet — nothing is shown rather than a guess.
        </Callout>
      </DashboardShell>
    )
  }

  const team = (settings.values.team ?? []) as TeamMember[]
  const roles = settings.approverRoles[section.policy] ?? []
  const mine = settings.changes.filter((c) => c.section === section.id)
  const open = mine.filter((c) => c.status === 'pending' || c.status === 'scheduled')
  const history = mine.filter((c) => !(c.status === 'pending' || c.status === 'scheduled')).slice(0, 5)
  const approverLine = `Changes need approval by another member (${roles.join(', ')}).`

  return (
    <DashboardShell>
      <DashboardHeader title={section.title} description={section.subtitle} kpis={[]} />

      {open.map((c) => (
        <ChangeCard key={c.id} change={c} section={section} team={team} approverRoles={roles} me={session.email} />
      ))}

      <DashCard title="In force" subtitle="The values the platform applies today">
        <SectionPanel
          section={section}
          value={settings.values[section.id]}
          locked={open.some((c) => c.status === 'pending')}
          approverLine={approverLine}
        />
      </DashCard>

      {history.length > 0 ? (
        <DashCard title="History" subtitle="The last changes to this section">
          <div className="flex flex-col gap-3">
            {history.map((c) => (
              <ChangeCard key={c.id} change={c} section={section} team={team} approverRoles={roles} me={session.email} />
            ))}
          </div>
        </DashCard>
      ) : null}
    </DashboardShell>
  )
}
