import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CommandLineIcon,
  CpuChipIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
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
 *   Operations  → le rebalancing se décide par vault ; l'écran global reste
 *                 accessible depuis le tableau de bord (activité, contrat).
 *
 * Réglages rassemble ce qui était éparpillé en trois groupes secondaires
 * (Product, Service, API explorer, Keeper, Series 1) : des surfaces d'outillage,
 * consultées rarement, qui n'ont pas à peser autant que le travail quotidien.
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
  { label: 'Mining', href: '/admin/mining', icon: CpuChipIcon },
  { label: 'Settings', href: '/admin/settings', icon: WrenchScrewdriverIcon },
]

/* ── Destinations secondaires ─────────────────────────────────────────────── */

export type SecondaryEntry = Readonly<{
  label: string
  href: string
  icon: NavIcon
  detail: string
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
    title: 'Settings',
    entries: [
      {
        label: 'Product',
        href: '/admin/product',
        icon: DocumentTextIcon,
        detail: 'Reserve, production and backtests — facts carried by the backend',
      },
      {
        label: 'Compliance',
        href: '/admin/compliance',
        icon: ShieldCheckIcon,
        detail: 'Read-only KYC queue — the decision belongs to the partner',
      },
      {
        label: 'Journal',
        href: '/admin/series-1',
        icon: Squares2X2Icon,
        detail: 'Explorer of indexed events, filterable',
      },
      {
        label: 'Service',
        href: '/admin/runtime',
        icon: SignalIcon,
        detail: 'Probes, runtime, coverage and raw responses',
      },
      {
        label: 'API explorer',
        href: '/admin/api-explorer',
        icon: CommandLineIcon,
        detail: 'Backend endpoints, their method, their access, a curl ready to copy',
      },
      {
        label: 'Keeper',
        href: '/admin/keeper',
        icon: BanknotesIcon,
        detail: 'Keeper requests with side effects, each behind an explicit confirmation',
      },
    ],
  },
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
  '/admin/client-simulator': '/admin/clients',
  '/admin/offers': '/admin/clients',
  '/admin/vaults': '/admin/clients',
  '/admin/product': '/admin/settings',
  '/admin/compliance': '/admin/settings',
  '/admin/series-1': '/admin/settings',
  '/admin/runtime': '/admin/settings',
  '/admin/api-explorer': '/admin/settings',
  '/admin/keeper': '/admin/settings',
  // L'activité et le contrat on-chain : un écran d'exploitation, rattaché à Clients.
  '/admin/operations': '/admin/clients',
  // La file de validations est le premier bloc du tableau de bord.
  '/admin/approvals': '/admin',
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
