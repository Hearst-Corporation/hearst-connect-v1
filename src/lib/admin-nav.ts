import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  HomeIcon,
  IdentificationIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid'

/**
 * Navigation de la console — CINQ destinations, et une seule idée directrice :
 * un client = un vault sur mesure.
 *
 * L'ancien menu en portait sept, organisées par SURFACE TECHNIQUE (Decisions,
 * Compliance, Operations…). Le travail réel ne suit pas ce découpage : il suit
 * un client, de la première offre jusqu'à son vault en vie courante. Une dérive
 * d'allocation n'est pas une « opération » dans l'absolu, c'est la dérive du
 * vault de quelqu'un.
 *
 * Ce que deviennent les anciennes entrées :
 *   Decisions   → la file de validations vit dans le Dashboard, où elle est
 *                 la première chose à traiter, et sur chaque fiche client.
 *   Compliance  → un onglet de la fiche client : le KYC concerne UN client.
 *   Operations  → le rebalancing se décide par vault : la dérive sur le
 *                 tableau de bord, l'historique sur la fiche client.
 * Ces trois routes redirigent ; aucune page ne les porte plus.
 *
 * Settings rassemble deux choses, et les sépare : les termes du PRODUIT (les
 * paramètres de chaque offre), et l'outillage TECHNIQUE (Integrations,
 * Service, API explorer, Keeper),
 * consulté rarement, qui n'a pas à peser autant que le travail quotidien.
 */

type NavIcon = typeof HomeIcon

export type NavEntry = Readonly<{
  label: string
  href: string
  icon: NavIcon
}>

export const ADMIN_NAV: readonly NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: HomeIcon },
  // Les clients AVANT les vaults : un vault n'existe pas sans le client pour
  // qui il a été taillé, et le travail commence toujours par une offre.
  /* UNE entrée, UNE page pour tout le parcours client. Les anciennes pages
     Offers et Vaults répétaient la même liste (un client = une offre = un
     vault, et « Open » menait à la même fiche) : ce sont devenus les filtres
     « Pipeline » et « Active » de Clients. */
  { label: 'Clients', href: '/admin/clients', icon: BuildingOffice2Icon },
  /* Le règlement du mois (Settlement) : le parc produit, chaque vault reçoit sa part, on
     valide son reward et on paie son électricité. L'économie du minage vit sur
     le tableau de bord ; la part d'un vault, sur sa fiche client. */
  { label: 'Settlement', href: '/admin/settlement', icon: CalendarDaysIcon },
  { label: 'Settings', href: '/admin/settings', icon: WrenchScrewdriverIcon },
]

/* ── Destinations secondaires ─────────────────────────────────────────────── */

export type SecondaryEntry = Readonly<{
  label: string
  href: string
  icon: NavIcon
  detail: string
  /** Le bloc du hub Settings : la référence métier, ou l'outillage technique. */
  section?: 'Product' | 'Technical'
}>

export type SecondaryGroup = Readonly<{
  title: string
  entries: readonly SecondaryEntry[]
}>

/**
 * Tout l'outillage sous UN groupe « Settings », rendu en sous-menu horizontal.
 *
 * Ces surfaces existent pour déboguer et vérifier, pas pour opérer : les voir
 * au même rang que les clients dans le rail latéral gonflait le menu sans
 * servir personne. Elles gardent leurs routes — rien n'est supprimé.
 */
export const ADMIN_SECONDARY: readonly SecondaryGroup[] = [
  {
    title: 'Account',
    entries: [
      {
        label: 'Your account',
        href: '/admin/profile',
        icon: IdentificationIcon,
        detail: 'Identity of the administrator session',
      },
    ],
  },
]

export const ADMIN_SECONDARY_FLAT: readonly SecondaryEntry[] = ADMIN_SECONDARY.flatMap(
  (g) => g.entries,
)

export type HubSection = Readonly<{
  title: string
  label: string
  href: string
  icon: NavIcon
}>

/**
 * Plus de hubs latéraux : « Settings » est désormais une entrée du menu
 * principal, et ses six surfaces se rangent dans son sous-menu horizontal. Un
 * rail qui portait trois hubs en plus de sept destinations donnait dix cibles
 * pour cinq tâches.
 */
export const ADMIN_SECTION_HUBS: readonly HubSection[] = []

export function activeSecondaryGroup(pathname: string): SecondaryGroup | undefined {
  return ADMIN_SECONDARY.find(
    (group) =>
      group.title !== 'Account' &&
      group.entries.some(
        (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
      ),
  )
}

/**
 * Le groupe « Account » est exclu d'`activeSecondaryGroup` : il ne pilote ni
 * hub ni sous-menu. Ce garde dédié permet au menu utilisateur de marquer « Your
 * account » actif sur `/admin/profile` sans réintroduire « Account » dans la
 * logique de hub.
 */
export function isAccountRoute(pathname: string): boolean {
  const group = ADMIN_SECONDARY.find((g) => g.title === 'Account')
  if (group === undefined) return false
  return group.entries.some(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  )
}

export function bodySubmenus(pathname: string): readonly SecondaryEntry[] | undefined {
  const group = activeSecondaryGroup(pathname)
  if (group === undefined || group.entries.length <= 1) return undefined
  return group.entries
}

export function activeBodyHref(pathname: string): string | undefined {
  const submenus = bodySubmenus(pathname)
  if (submenus === undefined) return undefined

  let best: string | undefined
  for (const entry of submenus) {
    const matches = pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    if (!matches) continue
    if (best === undefined || entry.href.length > best.length) best = entry.href
  }
  return best
}

/**
 * Routes rattachées à une entrée du menu sans en partager le préfixe.
 *
 * Les six surfaces de réglages marquent « Settings » actif : sans cela, ouvrir
 * l'explorateur d'API n'allumait aucune entrée et le rail paraissait éteint.
 */
const NAV_ALIASES: Readonly<Record<string, string>> = {
  '/admin/offers': '/admin/clients',
  '/admin/vaults': '/admin/clients',
}

export function activeHref(pathname: string): string | undefined {
  for (const [prefix, target] of Object.entries(NAV_ALIASES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return target
  }

  let best: string | undefined
  for (const entry of ADMIN_NAV) {
    const matches = pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    if (!matches) continue
    if (best === undefined || entry.href.length > best.length) best = entry.href
  }

  return best
}
