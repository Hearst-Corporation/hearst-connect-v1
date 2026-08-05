'use client'

import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/catalyst/sidebar'
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  PresentationChartLineIcon,
  Squares2X2Icon,
  UserCircleIcon,
} from '@heroicons/react/20/solid'
import { logout } from '@/lib/actions'
import { gcc } from './console'

/**
 * Le rail de navigation de l'ESPACE utilisateur — jumeau de `ConsoleRail`.
 *
 * Même composition Catalyst (`Sidebar`/`SidebarItem`), mêmes classes `gcc`, même
 * habillage accent : on ne réécrit rien. Seules changent les destinations (elles
 * pointent vers `/espace/*`, pas `/admin/*`) et l'intitulé de marque
 * (« Espace »). La déconnexion reste une ACTION (`SidebarItem type="submit"`
 * → server action `logout`), pas une navigation.
 *
 * Comme pour `ConsoleRail`, les destinations vivent ICI (module client) : un
 * composant d'icône est une fonction et ne franchit pas la frontière
 * serveur → client, donc la table ne peut pas venir des props.
 *
 * Cinq destinations primaires — la navigation demandée pour la surface user.
 */
const DESTINATIONS = [
  { href: '/espace', label: 'Cockpit', icon: Squares2X2Icon },
  { href: '/espace/dashboard', label: 'Tableau de bord', icon: PresentationChartLineIcon },
  { href: '/espace/bitcoin', label: 'Production Bitcoin', icon: BoltIcon },
  { href: '/espace/activite', label: 'Activité', icon: ArrowsRightLeftIcon },
  { href: '/espace/profil', label: 'Profil', icon: UserCircleIcon },
] as const

export function AppRail({
  /** Le href de la destination courante. Une chaîne franchit la frontière. */
  currentHref = '/espace',
  /**
   * L'identité affichée vient de la SESSION, jamais d'un défaut inventé.
   * Les deux props sont OBLIGATOIRES — un oubli casse la compilation plutôt
   * que d'afficher une fausse identité.
   */
  userName,
  userRole,
}: Readonly<{ currentHref?: string; userName: string; userRole: string }>) {
  const trimmed = userName.trim()
  const userInitial = trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : 'H'
  return (
    <div className={gcc.rail} data-gcc="rail">
      <Sidebar>
        <SidebarHeader className={gcc.brandHeader}>
          <div className={gcc.brandRow}>
            <div className={gcc.brandMark} data-gcc="brand" aria-hidden="true">
              HC
            </div>
            <div className={gcc.brandText}>
              <div className={gcc.brandName}>Hearst Connect</div>
              <div className={gcc.brandSub}>Espace</div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarBody>
          <SidebarSection>
            {DESTINATIONS.map((destination) => (
              <SidebarItem
                key={destination.href}
                href={destination.href}
                current={destination.href === currentHref}
                className={gcc.railItem}
              >
                <destination.icon data-slot="icon" />
                <SidebarLabel>{destination.label}</SidebarLabel>
              </SidebarItem>
            ))}
          </SidebarSection>
        </SidebarBody>

        <SidebarFooter className={gcc.railFooter}>
          <div className={gcc.railUser}>
            <div className={gcc.avatar} aria-hidden="true">
              {userInitial}
            </div>
            <div className={gcc.brandText}>
              <div className={gcc.brandName}>{userName}</div>
              <div className={gcc.brandSub}>Rôle : {userRole}</div>
            </div>
          </div>
          <SidebarSection>
            <form action={logout}>
              <SidebarItem type="submit" className={gcc.railItem}>
                <ArrowRightStartOnRectangleIcon data-slot="icon" />
                <SidebarLabel>Se déconnecter</SidebarLabel>
              </SidebarItem>
            </form>
          </SidebarSection>
        </SidebarFooter>
      </Sidebar>
    </div>
  )
}
