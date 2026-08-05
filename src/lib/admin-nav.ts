import {
  ArrowsRightLeftIcon,
  BuildingOffice2Icon,
  CircleStackIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  ShieldCheckIcon,
  SignalIcon,
  Squares2X2Icon,
  TableCellsIcon,
} from '@heroicons/react/20/solid'

/**
 * Console navigation — cinq destinations primaires dans la sidebar,
 * hubs de section (Journal, Produit, Service) et sous-menus horizontaux
 * dans le corps quand la section en porte plusieurs.
 */

type IconeNav = typeof HomeIcon

export type EntreeNav = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
}>

export const CLIENTS_ENTRY: EntreeNav = {
  libelle: 'Clients',
  href: '/admin/clients',
  icone: BuildingOffice2Icon,
}

export const VAULTS_ENTRY: EntreeNav = {
  libelle: 'Coffres',
  href: '/admin/vaults',
  icone: CircleStackIcon,
}

/** Les cinq destinations primaires rendues dans la sidebar. */
export const ADMIN_NAV: readonly EntreeNav[] = [
  { libelle: 'Accueil', href: '/admin', icone: HomeIcon },
  VAULTS_ENTRY,
  CLIENTS_ENTRY,
  { libelle: 'Conformité', href: '/admin/conformite', icone: ShieldCheckIcon },
  { libelle: 'Opérations', href: '/admin/operations', icone: ArrowsRightLeftIcon },
]

/* ── Secondary destinations ───────────────────────────────────────────────── */

export type EntreeSecondaire = Readonly<{
  libelle: string
  href: string
  icone: IconeNav
  detail: string
}>

export type GroupeSecondaire = Readonly<{
  titre: string
  entrees: readonly EntreeSecondaire[]
}>

export const VAULT_REGISTRY_ENTRY: EntreeSecondaire = {
  libelle: 'Registre des coffres',
  href: '/admin/vaults',
  icone: CircleStackIcon,
  detail: 'Chaque coffre, son client, son allocation et ses opérations en attente',
}

export const PRODUIT_ENTRY: EntreeSecondaire = {
  libelle: 'Produit',
  href: '/admin/produit',
  icone: DocumentTextIcon,
  detail: 'Production, réserve, rémunération et backtests sur un seul écran',
}

export const DATA_COVERAGE_ENTRY: EntreeSecondaire = {
  libelle: 'Couverture des données',
  href: '/admin/dashboard',
  icone: TableCellsIcon,
  detail: 'Ce que le service sert réellement, surface par surface',
}

/**
 * Groupes pour la sous-navigation horizontale et les hubs latéraux.
 * Les anciennes routes (`/admin/mining`, `/admin/product`, etc.) redirigent
 * vers `/admin/produit` — elles ne figurent plus ici.
 */
export const ADMIN_SECONDARY: readonly GroupeSecondaire[] = [
  {
    titre: 'Portfolio',
    entrees: [
      {
        libelle: 'Journal Série 1',
        href: '/admin/series-1',
        icone: Squares2X2Icon,
        detail: 'Le journal on-chain indexé de la Série 1',
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
        libelle: 'État du service',
        href: '/admin/runtime',
        icone: SignalIcon,
        detail: 'Sondes de dépendances, déploiement et réponses brutes',
      },
      DATA_COVERAGE_ENTRY,
    ],
  },
  {
    titre: 'Compte',
    entrees: [
      {
        libelle: 'Votre compte',
        href: '/admin/profile',
        icone: IdentificationIcon,
        detail: 'Le dossier investisseur rattaché à ce compte, s’il en existe un',
      },
    ],
  },
]

export const ADMIN_SECONDARY_FLAT: readonly EntreeSecondaire[] = ADMIN_SECONDARY.flatMap(
  (g) => g.entrees,
)

export type HubSection = Readonly<{
  titre: string
  libelle: string
  href: string
  icone: IconeNav
}>

export const ADMIN_SECTION_HUBS: readonly HubSection[] = [
  {
    titre: 'Portfolio',
    libelle: 'Journal Série 1',
    href: '/admin/series-1',
    icone: Squares2X2Icon,
  },
  {
    titre: 'Production',
    libelle: 'Produit',
    href: '/admin/produit',
    icone: DocumentTextIcon,
  },
  {
    titre: 'Service',
    libelle: 'Service',
    href: '/admin/runtime',
    icone: SignalIcon,
  },
]

export function groupeSecondaireActif(pathname: string): GroupeSecondaire | undefined {
  return ADMIN_SECONDARY.find(
    (groupe) =>
      groupe.titre !== 'Compte' &&
      groupe.entrees.some(
        (entree) => pathname === entree.href || pathname.startsWith(`${entree.href}/`),
      ),
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
