import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  CommandLineIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
  TableCellsIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid'

/**
 * Console navigation — five primary destinations, and only five.
 *
 * The previous flat list carried fourteen entries. Fourteen equally-weighted
 * choices is not navigation, it is an index: nothing is primary when
 * everything is. "API Explorer" and "Home" cannot be peers.
 *
 * So the menu now answers the five questions someone actually opens this
 * console for — where do we stand, who are the clients, are we compliant,
 * what moved, and who administers this — and every other screen is reached
 * from Administration, which owns them as a structured list.
 *
 * The secondary screens lost none of their reachability: they are one click
 * from Administration, and Administration lights up in the sidebar while you
 * are on one of them, so you always know where you are.
 */

export type IconeNav = typeof HomeIcon

export type EntreeNav = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
}>

/** The five primary destinations rendered in the sidebar. */
export const ADMIN_NAV: readonly EntreeNav[] = [
  { libelle: 'Home', href: '/admin', icone: HomeIcon },
  { libelle: 'Clients', href: '/admin/clients', icone: BuildingOffice2Icon },
  { libelle: 'Compliance', href: '/admin/conformite', icone: ShieldCheckIcon },
  { libelle: 'Operations', href: '/admin/operations', icone: ArrowsRightLeftIcon },
  { libelle: 'Administration', href: '/admin/administration', icone: UsersIcon },
]

/* ── Secondary destinations ───────────────────────────────────────────────── */

export type EntreeSecondaire = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
  /** What this screen carries that no other one does. */
  detail: string
}>

export type GroupeSecondaire = Readonly<{
  titre: string
  entrees: readonly EntreeSecondaire[]
}>

/**
 * Everything that is not a primary destination, grouped by subject.
 *
 * Administration renders this list; nothing else should hard-code these
 * routes, so adding a screen means adding one entry here.
 */
export const ADMIN_SECONDARY: readonly GroupeSecondaire[] = [
  {
    titre: 'Portfolio',
    entrees: [
      {
        libelle: 'Vault',
        href: '/admin/vault',
        icone: CircleStackIcon,
        detail: 'Strategic pockets, targets, and rebalancing',
      },
      {
        libelle: 'Series 1 Log',
        href: '/admin/series-1',
        icone: Squares2X2Icon,
        detail: 'The indexed on-chain log for Series 1',
      },
      {
        libelle: 'Product Sheet',
        href: '/admin/product',
        icone: DocumentTextIcon,
        detail: 'Subscription terms, duration, and fund cap',
      },
      {
        libelle: 'Consolidated product view',
        href: '/admin/administration/produit',
        icone: TableCellsIcon,
        detail: 'Production, reserve, and compensation on a single screen',
      },
    ],
  },
  {
    titre: 'Production',
    entrees: [
      {
        libelle: 'Mining',
        href: '/admin/mining',
        icone: CpuChipIcon,
        detail: 'Fleet capacity and attested production',
      },
      {
        libelle: 'Bitcoin',
        href: '/admin/btc',
        icone: CubeIcon,
        detail: 'Bitcoin produced, month by month',
      },
      {
        libelle: 'Backtests',
        href: '/admin/backtest',
        icone: PresentationChartLineIcon,
        detail: 'What the strategy would have produced in the past',
      },
    ],
  },
  {
    titre: 'Service',
    entrees: [
      {
        libelle: 'Service Status',
        href: '/admin/runtime',
        icone: SignalIcon,
        detail: 'Dependency probes, deployment, and raw responses',
      },
      {
        libelle: 'Keeper Actions',
        href: '/admin/keeper',
        icone: WrenchScrewdriverIcon,
        detail: 'Operational actions exposed by the service',
      },
      {
        libelle: 'API Explorer',
        href: '/admin/api-explorer',
        icone: CommandLineIcon,
        detail: 'Every endpoint, called live, with its trace',
      },
      {
        libelle: 'Data coverage',
        href: '/admin/dashboard',
        icone: TableCellsIcon,
        detail: 'What the service actually serves, surface by surface',
      },
    ],
  },
  {
    titre: 'Account',
    entrees: [
      {
        libelle: 'Your account',
        href: '/admin/profile',
        icone: IdentificationIcon,
        detail: 'The investor record linked to this account, if one exists',
      },
    ],
  },
]

/** Flat view of the secondary destinations — for lookups, not for rendering. */
export const ADMIN_SECONDARY_FLAT: readonly EntreeSecondaire[] = ADMIN_SECONDARY.flatMap(
  (g) => g.entrees,
)

/**
 * Active entry: the LONGEST declared path that prefixes the current page.
 *
 * The longest, not the first match, because `/admin` prefixes every page in
 * the console — without this rule it would stay lit everywhere.
 *
 * A secondary screen resolves to Administration: the sidebar must never go
 * dark just because the current page is not one of the five.
 */
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
  if (estSecondaire) return '/admin/administration'

  return meilleur
}

/** The secondary entry matching a path, when there is one. */
export function entreeSecondaire(pathname: string): EntreeSecondaire | undefined {
  return ADMIN_SECONDARY_FLAT.find((e) => pathname === e.href || pathname.startsWith(`${e.href}/`))
}
