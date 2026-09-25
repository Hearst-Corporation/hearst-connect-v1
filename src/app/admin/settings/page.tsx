import { DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Link } from '@/components/catalyst/link'
import { requireSession } from '@/lib/auth'
import { ADMIN_SECONDARY } from '@/lib/admin-nav'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

/**
 * Le hub des réglages.
 *
 * Six surfaces d'outillage — produit, conformité, journal, service, explorateur
 * d'API, keeper — occupaient chacune un rang dans le menu latéral, au même
 * niveau que les clients et les vaults. Elles servent à vérifier et déboguer,
 * pas à opérer : les voir toutes en permanence donnait dix cibles pour cinq
 * tâches quotidiennes.
 *
 * Elles gardent leurs routes. Cette page les rassemble, chacune avec ce qu'elle
 * fait — un menu qui ne dit que des noms oblige à cliquer pour se souvenir.
 */
export default async function SettingsPage() {
  await requireSession()

  const group = ADMIN_SECONDARY.find((g) => g.title === 'Settings')
  const entries = group?.entries ?? []

  return (
    <DashboardShell>
      <DashboardHeader
        title="Settings"
        description="Tooling and reference surfaces — product facts, compliance queue, service health, API catalogue."
        kpis={[]}
      />

      <BentoGrid>
        {entries.map((entry) => {
          const Icon = entry.icon
          return (
            <BentoCard key={entry.href} span={6}>
              <Link href={entry.href} className="group block">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-accent-400" />
                  <span className="font-medium group-hover:text-accent-400">{entry.label}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-fg-tertiary">{entry.detail}</p>
              </Link>
            </BentoCard>
          )
        })}
      </BentoGrid>
    </DashboardShell>
  )
}
