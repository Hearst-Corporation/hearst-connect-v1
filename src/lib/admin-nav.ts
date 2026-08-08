import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  CommandLineIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
  TableCellsIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid'

/**
 * Console navigation — five primary sidebar destinations,
 * section hubs (Journal, Product, Service) and horizontal body sub-menus
 * when a section has several entries.
 *
 * Single dashboard: `/admin`. Legacy `/admin/dashboard` redirects.
 */

type IconeNav = typeof HomeIcon

export type EntreeNav = Readonly<{
  label: string
  href: string
  icone: IconeNav
}>

export const CLIENTS_ENTRY: EntreeNav = {
  label: 'Clients',
  href: '/admin/clients',
  icone: BuildingOffice2Icon,
}

export const VAULTS_ENTRY: EntreeNav = {
  label: 'Vaults',
  href: '/admin/vaults',
  icone: CircleStackIcon,
}

export const ADMIN_NAV: readonly EntreeNav[] = [
  { label: 'Dashboard', href: '/admin', icone: HomeIcon },
  VAULTS_ENTRY,
  CLIENTS_ENTRY,
  { label: 'Compliance', href: '/admin/compliance', icone: ShieldCheckIcon },
  { label: 'Operations', href: '/admin/operations', icone: ArrowsRightLeftIcon },
]

/* ── Secondary destinations ───────────────────────────────────────────────── */

export type EntreeSecondaire = Readonly<{
  label: string
  href: string
  icone: IconeNav
  detail: string
}>

export type GroupeSecondaire = Readonly<{
  titre: string
  entrees: readonly EntreeSecondaire[]
}>

export const VAULT_REGISTRY_ENTRY: EntreeSecondaire = {
  label: 'Vault registry',
  href: '/admin/vaults',
  icone: CircleStackIcon,
  detail: 'Each vault, its client, allocation, and pending operations',
}

export const PRODUIT_ENTRY: EntreeSecondaire = {
  label: 'Product',
  href: '/admin/product',
  icone: DocumentTextIcon,
  detail: 'Business production, reserve, yield, and backtests — backend-owned facts only',
}

/**
 * Data coverage — section inside `/admin/runtime` (probes + coverage),
 * not a separate destination.
 */
export const DATA_COVERAGE_ENTRY: EntreeSecondaire = {
  label: 'Data coverage',
  href: '/admin/runtime',
  icone: TableCellsIcon,
  detail: 'Canonical source health and coverage — Service hub only',
}

/**
 * Groups for horizontal sub-navigation and lateral hubs.
 * Legacy routes (`/admin/mining`, `/admin/product`, `/admin/dashboard`, etc.)
 * redirect — they no longer appear here.
 */
export const ADMIN_SECONDARY: readonly GroupeSecondaire[] = [
  {
    titre: 'Portfolio',
    entrees: [
      {
        label: 'Series 1 journal',
        href: '/admin/series-1',
        icone: Squares2X2Icon,
        detail: 'Operational event explorer with filters on indexed Series 1',
      },
    ],
  },
  {
    titre: 'Production',
    entrees: [PRODUIT_ENTRY],
  },
  {
    titre: 'Service',
    entrees: [
      {
        label: 'Service',
        href: '/admin/runtime',
        icone: SignalIcon,
        detail: 'Single observability surface — probes, runtime, coverage, raw responses',
      },
      {
        label: 'API explorer',
        href: '/admin/api-explorer',
        icone: CommandLineIcon,
        detail: 'Backend endpoints, their method, access level, and a curl ready to copy',
      },
      {
        label: 'Keeper actions',
        href: '/admin/keeper',
        icone: WrenchScrewdriverIcon,
        detail: 'Side-effect Keeper requests, each under explicit confirmation',
      },
    ],
  },
  {
    titre: 'Account',
    entrees: [
      {
        label: 'Your account',
        href: '/admin/profile',
        icone: IdentificationIcon,
        detail: 'Administrator session identity',
      },
    ],
  },
]

export const ADMIN_SECONDARY_FLAT: readonly EntreeSecondaire[] = ADMIN_SECONDARY.flatMap(
  (g) => g.entrees,
)

export type HubSection = Readonly<{
  titre: string
  label: string
  href: string
  icone: IconeNav
}>

export const ADMIN_SECTION_HUBS: readonly HubSection[] = [
  {
    titre: 'Portfolio',
    label: 'Series 1 journal',
    href: '/admin/series-1',
    icone: Squares2X2Icon,
  },
  {
    titre: 'Production',
    label: 'Product',
    href: '/admin/product',
    icone: DocumentTextIcon,
  },
  {
    titre: 'Service',
    label: 'Service',
    href: '/admin/runtime',
    icone: SignalIcon,
  },
]

export function groupeSecondaireActif(pathname: string): GroupeSecondaire | undefined {
  return ADMIN_SECONDARY.find(
    (groupe) =>
      groupe.titre !== 'Account' &&
      groupe.entrees.some(
        (entree) => pathname === entree.href || pathname.startsWith(`${entree.href}/`),
      ),
  )
}

/**
 * The "Account" group is excluded from `groupeSecondaireActif`: it does not
 * drive a lateral hub or horizontal sub-nav. This dedicated guard lets the
 * user menu mark "Your account" active on `/admin/profile` without reintroducing
 * "Account" into hub logic.
 */
export function estRouteCompte(pathname: string): boolean {
  const groupe = ADMIN_SECONDARY.find((g) => g.titre === 'Account')
  if (groupe === undefined) return false
  return groupe.entrees.some(
    (entree) => pathname === entree.href || pathname.startsWith(`${entree.href}/`),
  )
}

export function sousMenusCorps(pathname: string): readonly EntreeSecondaire[] | undefined {
  const groupe = groupeSecondaireActif(pathname)
  if (groupe === undefined || groupe.entrees.length <= 1) return undefined
  return groupe.entrees
}

export function hrefCorpsActif(pathname: string): string | undefined {
  const sousMenus = sousMenusCorps(pathname)
  if (sousMenus === undefined) return undefined

  let meilleur: string | undefined
  for (const entree of sousMenus) {
    const correspond = pathname === entree.href || pathname.startsWith(`${entree.href}/`)
    if (!correspond) continue
    if (meilleur === undefined || entree.href.length > meilleur.length) meilleur = entree.href
  }
  return meilleur
}

export function hrefActif(pathname: string): string | undefined {
  let meilleur: string | undefined
  for (const entree of ADMIN_NAV) {
    const correspond = pathname === entree.href || pathname.startsWith(`${entree.href}/`)
    if (!correspond) continue
    if (meilleur === undefined || entree.href.length > meilleur.length) meilleur = entree.href
  }

  const estSecondaire = ADMIN_SECONDARY_FLAT.some(
    (e) => pathname === e.href || pathname.startsWith(`${e.href}/`),
  )
  if (estSecondaire) return undefined

  return meilleur
}
