import { SettingsNav } from '@/features/settings/settings-nav'
import { requireSession } from '@/lib/auth'
import { loadSettings } from '@/lib/settings/load'

/**
 * SETTINGS — un sous-menu vertical à gauche, la section à droite.
 *
 * Settings CONFIGURE et GOUVERNE : chaque changement est une demande approuvée
 * par un autre membre, puis appliquée après son délai. Ce qu'on observe (santé
 * du backend, API) vit en bas, sous « Developer ».
 */
export default async function SettingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireSession()
  const settings = await loadSettings()
  const pendingBySection: Record<string, number> = {}
  for (const c of settings?.changes ?? []) {
    if (c.status === 'pending' || c.status === 'scheduled') pendingBySection[c.section] = (pendingBySection[c.section] ?? 0) + 1
  }
  const total = Object.values(pendingBySection).reduce((a, b) => a + b, 0)
  if (total > 0) pendingBySection.settings = total

  return (
    <div className="flex min-w-0 flex-col gap-0 lg:flex-row lg:gap-8">
      <SettingsNav pendingBySection={pendingBySection} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
