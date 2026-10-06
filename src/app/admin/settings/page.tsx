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
            <BentoCard key={entry.href} span={4} bare>
              {/* Aplat vert citrus, encre sombre : les six surfaces d'outillage
                  se lisent comme des portes d'entrée, pas comme du texte. */}
              <Link
                href={entry.href}
                className="group flex h-full flex-col gap-3 rounded-[var(--ud-radius)] bg-[var(--hearst-green)] p-5 text-[var(--hearst-green-ink)] no-underline transition-[filter] hover:brightness-[1.04]"
              >
                <span className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[var(--hearst-green-ink)]/10">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm opacity-60 transition-transform group-hover:translate-x-0.5">→</span>
                </span>
                <span className="text-[17px] font-medium">{entry.label}</span>
                <span className="text-xs leading-relaxed opacity-75">{entry.detail}</span>
              </Link>
            </BentoCard>
          )
        })}
      </BentoGrid>
    </DashboardShell>
  )
}
