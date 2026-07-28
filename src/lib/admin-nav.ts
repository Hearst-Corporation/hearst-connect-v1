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
 * Navigation de la console — une seule liste, à plat.
 *
 * Les groupes repliables ont été retirés : sur cinq groupes, les intitulés se
 * tronquaient (« SOCLE TECHNIQUE ET A… ») et il fallait deux clics pour
 * atteindre une page. Une liste directe se parcourt d'un coup d'œil.
 *
 * `separateurAvant` pose un filet discret entre deux familles d'écrans — un
 * trait suffit à marquer la rupture, sans ajouter un titre de section de plus.
 *
 * Trois pages restent volontairement hors de cette liste et s'atteignent depuis
 * « Administration » : la couverture des données, la vue produit consolidée et
 * le profil connecté. Les mettre ici allongerait le menu sans servir le
 * parcours quotidien.
 */

export type IconeNav = typeof HomeIcon

export type EntreeNav = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
  /** Filet de séparation posé au-dessus de cette entrée. */
  separateurAvant?: boolean
}>

export const ADMIN_NAV: readonly EntreeNav[] = [
  { libelle: 'Accueil', href: '/admin', icone: HomeIcon },
  { libelle: 'Portefeuille', href: '/admin/vault', icone: CircleStackIcon },
  { libelle: 'Mouvements', href: '/admin/operations', icone: ArrowsRightLeftIcon },
  { libelle: 'Journal Série 1', href: '/admin/series-1', icone: Squares2X2Icon },

  { libelle: 'Minage', href: '/admin/mining', icone: CpuChipIcon, separateurAvant: true },
  { libelle: 'Bitcoin', href: '/admin/btc', icone: CubeIcon },
  { libelle: 'Fiche produit', href: '/admin/product', icone: DocumentTextIcon },
  { libelle: 'Rétro-tests', href: '/admin/backtest', icone: PresentationChartLineIcon },

  { libelle: 'Clients', href: '/admin/clients', icone: BuildingOffice2Icon, separateurAvant: true },
  { libelle: 'Conformité', href: '/admin/conformite', icone: ShieldCheckIcon },

  { libelle: 'État du service', href: '/admin/runtime', icone: SignalIcon, separateurAvant: true },
  { libelle: 'Actions keeper', href: '/admin/keeper', icone: WrenchScrewdriverIcon },
  { libelle: 'Explorateur d’API', href: '/admin/api-explorer', icone: CommandLineIcon },
  { libelle: 'Administration', href: '/admin/administration', icone: UsersIcon },
]

/**
 * Entrée active : le PLUS LONG chemin déclaré qui préfixe la page courante.
 *
 * Le plus long, et pas le premier qui correspond, parce que `/admin` préfixe
 * toutes les pages de la console : sans cette règle il resterait allumé partout.
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
