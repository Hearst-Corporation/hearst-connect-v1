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
import { csl } from './console'

/**
 * Le rail de navigation de l'ESPACE utilisateur — jumeau de `ConsoleRail`.
 *
 * Même composition Catalyst (`Sidebar`/`SidebarItem`), mêmes classes `csl`, même
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
  { href: '/espace', label: 'Accueil', icon: Squares2X2Icon },
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
    <div className={csl.rail} data-csl="rail">
      <Sidebar>
        <SidebarHeader className={csl.brandHeader}>
          <div className={csl.brandRow}>
            <div className={csl.brandMark} data-csl="brand" aria-hidden="true">
              HC
            </div>
            <div className={csl.brandText}>
              <div className={csl.brandName}>Hearst Connect</div>
              <div className={csl.brandSub}>Espace</div>
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
                className={csl.railItem}
              >
                <destination.icon data-slot="icon" />
                <SidebarLabel>{destination.label}</SidebarLabel>
              </SidebarItem>
            ))}
          </SidebarSection>
        </SidebarBody>

        <SidebarFooter className={csl.railFooter}>
          <div className={csl.railUser}>
            <div className={csl.avatar} aria-hidden="true">
              {userInitial}
            </div>
            <div className={csl.brandText}>
              <div className={csl.brandName}>{userName}</div>
              <div className={csl.brandSub}>Rôle : {userRole}</div>
            </div>
          </div>
          <SidebarSection>
            <form action={logout}>
              <SidebarItem type="submit" className={csl.railItem}>
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
