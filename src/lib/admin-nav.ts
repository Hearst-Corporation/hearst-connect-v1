import {
  BanknotesIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
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
 *   Operations  → le rebalancing se décide par vault, il rejoint Vaults.
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
  { label: 'Clients', href: '/admin/clients', icon: BuildingOffice2Icon },
  { label: 'Offers', href: '/admin/offers', icon: DocumentTextIcon },
  { label: 'Vaults', href: '/admin/vaults', icon: CircleStackIcon },
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
        detail: 'Réserve, production et backtests — faits portés par le backend',
      },
      {
        label: 'Compliance',
        href: '/admin/compliance',
        icon: ShieldCheckIcon,
        detail: 'File KYC en lecture seule — la décision appartient au partenaire',
      },
      {
        label: 'Journal',
        href: '/admin/series-1',
        icon: Squares2X2Icon,
        detail: 'Explorateur des événements indexés, filtrable',
      },
      {
        label: 'Service',
        href: '/admin/runtime',
        icon: SignalIcon,
        detail: 'Sondes, runtime, couverture et réponses brutes',
      },
      {
        label: 'API explorer',
        href: '/admin/api-explorer',
        icon: CommandLineIcon,
        detail: 'Endpoints du backend, leur méthode, leur accès, un curl prêt à copier',
      },
      {
        label: 'Keeper',
        href: '/admin/keeper',
        icon: BanknotesIcon,
        detail: 'Requêtes Keeper à effet de bord, chacune sous confirmation explicite',
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
        detail: 'Identité de la session administrateur',
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
  '/admin/product': '/admin/settings',
  '/admin/compliance': '/admin/settings',
  '/admin/series-1': '/admin/settings',
  '/admin/runtime': '/admin/settings',
  '/admin/api-explorer': '/admin/settings',
  '/admin/keeper': '/admin/settings',
  // Le rebalancing se décide vault par vault : l'écran global rejoint Vaults.
  '/admin/operations': '/admin/vaults',
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
