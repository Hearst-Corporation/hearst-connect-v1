import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  CommandLineIcon,
  CpuChipIcon,
  CubeIcon,
  DocumentTextIcon,
  HomeIcon,
  PresentationChartLineIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/20/solid'

/**
 * Console navigation — a single flat list.
 *
 * Collapsible groups were removed: across five groups, labels truncated
 * ("CORE TECHNICAL A…") and reaching a page took two clicks. A flat list
 * scans in one glance.
 *
 * `separateurAvant` draws a discreet rule between two families of screens —
 * a line is enough to mark the break, without adding another section title.
 *
 * Three pages stay deliberately out of this list and are reached from
 * "Administration": data coverage, the consolidated product view, and the
 * signed-in profile. Adding them here would lengthen the menu without
 * serving the everyday path.
 */

export type IconeNav = typeof HomeIcon

export type EntreeNav = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
  /** Separator rule drawn above this entry. */
  separateurAvant?: boolean
}>

export const ADMIN_NAV: readonly EntreeNav[] = [
  { libelle: 'Home', href: '/admin', icone: HomeIcon },
  { libelle: 'Vault', href: '/admin/vault', icone: CircleStackIcon },
  { libelle: 'Operations', href: '/admin/operations', icone: ArrowsRightLeftIcon },
  { libelle: 'Series 1 Log', href: '/admin/series-1', icone: Squares2X2Icon },

  { libelle: 'Mining', href: '/admin/mining', icone: CpuChipIcon, separateurAvant: true },
  { libelle: 'Bitcoin', href: '/admin/btc', icone: CubeIcon },
  { libelle: 'Product Sheet', href: '/admin/product', icone: DocumentTextIcon },
  { libelle: 'Backtests', href: '/admin/backtest', icone: PresentationChartLineIcon },

  { libelle: 'Clients', href: '/admin/clients', icone: BuildingOffice2Icon, separateurAvant: true },
  { libelle: 'Compliance', href: '/admin/conformite', icone: ShieldCheckIcon },

  { libelle: 'Service Status', href: '/admin/runtime', icone: SignalIcon, separateurAvant: true },
  { libelle: 'Keeper Actions', href: '/admin/keeper', icone: WrenchScrewdriverIcon },
  { libelle: 'API Explorer', href: '/admin/api-explorer', icone: CommandLineIcon },
  { libelle: 'Administration', href: '/admin/administration', icone: UsersIcon },
]

/**
 * Active entry: the LONGEST declared path that prefixes the current page.
 *
 * The longest, not the first match, because `/admin` prefixes every page in
 * the console — without this rule it would stay lit everywhere.
 */
export function hrefActif(pathname: string): string | undefined {
  let meilleur: string | undefined
  for (const entree of ADMIN_NAV) {
    const correspond = pathname === entree.href || pathname.startsWith(`${entree.href}/`)
    if (!correspond) continue
    if (meilleur === undefined || entree.href.length > meilleur.length) meilleur = entree.href
  }
  return meilleur
}
