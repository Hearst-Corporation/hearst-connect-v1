import {
  ArrowsRightLeftIcon,
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
 * Console navigation — five primary sidebar destinations,
 * section hubs (Journal, Product, Service) and horizontal body sub-menus
 * when a section has several entries.
 *
 * Single dashboard: `/admin`. Legacy `/admin/dashboard` redirects.
 */

type NavIcon = typeof HomeIcon

export type NavEntry = Readonly<{
  label: string
  href: string
  icon: NavIcon
}>

const CLIENTS_ENTRY: NavEntry = {
  label: 'Clients',
  href: '/admin/clients',
  icon: BuildingOffice2Icon,
}

const VAULTS_ENTRY: NavEntry = {
  label: 'Vaults',
  href: '/admin/vaults',
  icon: CircleStackIcon,
}

export const ADMIN_NAV: readonly NavEntry[] = [
  { label: 'Dashboard', href: '/admin', icon: HomeIcon },
  VAULTS_ENTRY,
  CLIENTS_ENTRY,
  { label: 'Mining', href: '/admin/mining', icon: CpuChipIcon },
  { label: 'Compliance', href: '/admin/compliance', icon: ShieldCheckIcon },
  { label: 'Operations', href: '/admin/operations', icon: ArrowsRightLeftIcon },
]

/* ── Secondary destinations ───────────────────────────────────────────────── */

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

const PRODUCT_ENTRY: SecondaryEntry = {
  label: 'Product',
  href: '/admin/product',
  icon: DocumentTextIcon,
  detail: 'Business production, reserve, yield, and backtests — backend-owned facts only',
}

/**
 * Groups for horizontal sub-navigation and lateral hubs.
 * Legacy routes (`/admin/mining`, `/admin/product`, `/admin/dashboard`, etc.)
 * redirect — they no longer appear here.
 */
export const ADMIN_SECONDARY: readonly SecondaryGroup[] = [
  {
    title: 'Portfolio',
    entries: [
      {
        label: 'Series 1 journal',
        href: '/admin/series-1',
        icon: Squares2X2Icon,
        detail: 'Operational event explorer with filters on indexed Series 1',
      },
    ],
  },
  {
    title: 'Production',
    entries: [PRODUCT_ENTRY],
  },
  {
    title: 'Service',
    entries: [
      {
        label: 'Service',
        href: '/admin/runtime',
        icon: SignalIcon,
        detail: 'Single observability surface — probes, runtime, coverage, raw responses',
      },
      {
        label: 'API explorer',
        href: '/admin/api-explorer',
        icon: CommandLineIcon,
        detail: 'Backend endpoints, their method, access level, and a curl ready to copy',
      },
      {
        label: 'Keeper actions',
        href: '/admin/keeper',
        icon: WrenchScrewdriverIcon,
        detail: 'Side-effect Keeper requests, each under explicit confirmation',
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
        detail: 'Administrator session identity',
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

export const ADMIN_SECTION_HUBS: readonly HubSection[] = [
  {
    title: 'Portfolio',
    label: 'Series 1 journal',
    href: '/admin/series-1',
    icon: Squares2X2Icon,
  },
  {
    title: 'Production',
    label: 'Product',
    href: '/admin/product',
    icon: DocumentTextIcon,
  },
  {
    title: 'Service',
    label: 'Service',
    href: '/admin/runtime',
    icon: SignalIcon,
  },
]

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
 * The "Account" group is excluded from `activeSecondaryGroup`: it does not
 * drive a lateral hub or horizontal sub-nav. This dedicated guard lets the
 * user menu mark "Your account" active on `/admin/profile` without reintroducing
 * "Account" into hub logic.
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

export function activeHref(pathname: string): string | undefined {
  let best: string | undefined
  for (const entry of ADMIN_NAV) {
    const matches = pathname === entry.href || pathname.startsWith(`${entry.href}/`)
    if (!matches) continue
    if (best === undefined || entry.href.length > best.length) best = entry.href
  }

  const isSecondary = ADMIN_SECONDARY_FLAT.some(
    (e) => pathname === e.href || pathname.startsWith(`${e.href}/`),
  )
  if (isSecondary) return undefined

  return best
}
