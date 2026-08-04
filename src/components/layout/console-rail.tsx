'use client'

import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarHeading,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/catalyst/sidebar'
import {
  ArrowRightStartOnRectangleIcon,
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  HomeIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid'
import { logout } from '@/lib/actions'
import { gcc } from './console'

/**
 * Le rail de navigation — porté par Catalyst, habillé à l'accent du plateau.
 *
 * ── Ce qui a changé, et pourquoi ──────────────────────────────────────────
 * La première version de ce rail était cinq `<Link>` maison avec des glyphes
 * monochromes et du CSS scopé. Elle rendait la bonne image et ne réutilisait
 * RIEN : chaque état (survol, focus, page courante) était à réinventer, et
 * l'indicateur de page courante n'existait pas.
 *
 * Le rail s'appuie désormais sur `Sidebar` / `SidebarItem` de Catalyst, qui
 * apportent ce qu'on ne réécrit pas correctement à la main :
 *   · le câblage Headless UI (`CloseButton` sur un `Link`) ;
 *   · les états `data-hover`, `data-active`, `data-current` ;
 *   · l'anneau de focus et la cible tactile de 44 px (`TouchTarget`) ;
 *   · l'indicateur de page courante animé (`motion`, `layoutId`).
 *
 * Les fichiers Catalyst ne sont pas modifiés : on les COMPOSE. Ce que ce
 * fichier ajoute par-dessus, c'est uniquement la matière — le dégradé du rail,
 * le bloc de marque, et l'accent.
 *
 * ── UN SEUL ACCENT : le mint de marque ────────────────────────────────────
 * Toute la composition parle le mint `#a7fb90` — la couleur que `/admin` et le
 * reste du produit utilisent. Le néon `#79ff00` du prototype a disparu : cinq
 * nuances de vert cohabitaient, il n'en reste qu'une, et c'est celle de la
 * marque.
 *
 * Le texte posé sur l'aplat accent est sombre : du blanc sur un vert clair
 * tomberait sous 1,5:1 et serait illisible.
 *
 * Composant CLIENT : `SidebarItem` utilise Headless UI et `motion`.
 */

/**
 * Les destinations vivent ICI, pas dans les props.
 *
 * Un composant d'icône est une fonction : il ne franchit pas la frontière
 * serveur → client. Passer `icon: HomeIcon` depuis le tableau de bord (rendu sur
 * le serveur) échoue avec « Only plain objects can be passed to Client
 * Components » — erreur réelle, rencontrée à la première tentative. La table est
 * donc déclarée dans le module client qui la consomme.
 *
 * Ce sont les cinq destinations primaires de `ADMIN_NAV`, avec les mêmes icônes
 * que la console : le rail du laboratoire ne mène pas ailleurs que la vraie.
 * Deux surfaces secondaires s'y ajoutent plus bas, sous leur propre intitulé.
 */
const DESTINATIONS = [
  { href: '/admin', label: 'Accueil', icon: HomeIcon },
  { href: '/admin/clients', label: 'Clients', icon: BuildingOffice2Icon },
  { href: '/admin/conformite', label: 'Conformité', icon: ShieldCheckIcon },
  { href: '/admin/operations', label: 'Opérations', icon: ArrowsRightLeftIcon },
  { href: '/admin/administration', label: 'Administration', icon: UsersIcon },
] as const

/**
 * Les surfaces secondaires, sous leur propre `SidebarHeading`.
 *
 * Sans elles le rail montrait cinq entrées puis un grand vide. Un aplat vide de
 * 900 px ne lit pas comme une colonne meublée, à dégradé pourtant identique.
 */
const SURFACES = [
  { href: '/admin/dashboard', label: 'Couverture des données', icon: PresentationChartLineIcon },
  { href: '/admin/runtime', label: 'Exécution', icon: WrenchScrewdriverIcon },
] as const

export function ConsoleRail({
  /** Le href de la destination courante. Une chaîne franchit la frontière. */
  currentHref = '/admin',
  /**
   * L'identité affichée vient de la SESSION, pas d'un défaut.
   *
   * La première version écrivait `userName = 'adrien'` et `userRole = 'OWNER'`
   * en dur : le rail affichait donc une identité inventée, indistinguable de la
   * vraie. Les deux props sont désormais OBLIGATOIRES — un oubli casse la
   * compilation au lieu de publier une fausse identité.
   */
  userName,
  userRole,
}: Readonly<{ currentHref?: string; userName: string; userRole: string }>) {
  // `charAt(0)` d'une chaîne vide rend `''`, dont `toUpperCase()` reste `''` :
  // le repli est donc atteint, mais on l'écrit explicitement plutôt que de
  // dépendre de cette chaîne de coïncidences.
  const trimmed = userName.trim()
  const userInitial = trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : 'H'
  return (
    <div className={gcc.rail} data-gcc="rail">
      <Sidebar>
        {/* SidebarHeader : la marque ET son intitulé, comme la console. */}
        <SidebarHeader className={gcc.brandHeader}>
          <div className={gcc.brandRow}>
            <div className={gcc.brandMark} data-gcc="brand" aria-hidden="true">
              HC
            </div>
            <div className={gcc.brandText}>
              <div className={gcc.brandName}>Hearst Connect</div>
              <div className={gcc.brandSub}>Administration</div>
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

          <SidebarSection>
            <SidebarHeading>Surfaces</SidebarHeading>
            {SURFACES.map((surface) => (
              <SidebarItem
                key={surface.href}
                href={surface.href}
                current={surface.href === currentHref}
                className={gcc.railItem}
              >
                <surface.icon data-slot="icon" />
                <SidebarLabel>{surface.label}</SidebarLabel>
              </SidebarItem>
            ))}
          </SidebarSection>
        </SidebarBody>

        {/* SidebarFooter : identité, déconnexion, puis la légende. */}
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
          {/*
            * La déconnexion est une ACTION, pas une navigation.
            *
            * La première version pointait `href="/admin/profile"` : le bouton
            * disait « Sign out » et ouvrait une page de profil. `SidebarItem`
            * sans `href` rend un `<button type="submit">`, ce qui déclenche le
            * server action `logout`. C'était déjà le montage de l'ancien
            * `admin-shell.tsx` (supprimé au Lot 7), repris à l'identique.
            */}
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
