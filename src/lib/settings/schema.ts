/**
 * LES RÉGLAGES — une seule définition, toutes les pages.
 *
 * Chaque section dit ce qu'elle contient (ses champs), comment elle se lit
 * (un objet ou une liste de lignes) et comment elle se GOUVERNE : tout
 * changement crée une demande, approuvée par un autre membre que son auteur
 * (règle des quatre yeux), et les paramètres de risque attendent un délai
 * avant de s'appliquer (timelock, comme un curator Morpho).
 *
 * La page `/admin/settings/[section]` rend n'importe quelle section à partir de
 * ce schéma : ajouter un réglage, c'est ajouter un champ ici.
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'number'
  | 'usd'
  | 'bps'
  | 'btc'
  | 'hours'
  | 'months'
  | 'bool'
  | 'select'
  | 'tags'
  | 'address'
  | 'readonly'

export type Field = Readonly<{
  key: string
  label: string
  type: FieldType
  options?: readonly string[]
  help?: string
  /** Colonne large dans une liste (adresse, objet d'e-mail…). */
  wide?: boolean
}>

export type SectionGroup = 'Organisation' | 'Product' | 'Treasury' | 'Clients' | 'Platform'

export type Section = Readonly<{
  id: string
  group: SectionGroup
  title: string
  subtitle: string
  kind: 'object' | 'list'
  fields: readonly Field[]
  /** Liste à lignes fixes (pas d'ajout ni de retrait) : les profils, les gabarits… */
  fixedRows?: boolean
  /** La règle d'approbation qui gouverne cette section (voir la section `policies`). */
  policy: 'settings' | 'risk' | 'treasury'
  /** Délai entre l'approbation et l'application, en heures. 0 = immédiat. */
  timelockHours: number
  /** Une ligne pour dire pourquoi ce délai, ou pourquoi aucun. */
  governanceNote: string
}>

export const ROLES = ['Admin', 'Risk', 'Finance', 'Compliance', 'Relationship manager', 'Viewer'] as const

export const SECTIONS: readonly Section[] = [
  // ── ORGANISATION ──────────────────────────────────────────────────────────
  {
    id: 'team',
    group: 'Organisation',
    title: 'Team & roles',
    subtitle: 'Who works in the console, and what each role may do',
    kind: 'list',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'email', wide: true },
      { key: 'role', label: 'Role', type: 'select', options: ROLES },
      { key: 'twoFactor', label: '2FA', type: 'bool' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'invited', 'suspended'] },
    ],
    policy: 'settings',
    timelockHours: 0,
    governanceNote: 'Applies as soon as it is approved — a departure must not wait.',
  },
  {
    id: 'policies',
    group: 'Organisation',
    title: 'Approval policies',
    subtitle: 'Who approves what, and how many people it takes — mirrored in the Fireblocks policy',
    kind: 'list',
    fixedRows: true,
    fields: [
      { key: 'label', label: 'Action', type: 'readonly', wide: true },
      { key: 'approvers', label: 'Approvers', type: 'number', help: 'People, other than the author' },
      { key: 'roles', label: 'Roles allowed', type: 'tags', options: ROLES, wide: true },
      { key: 'thresholdBtc', label: 'Above (BTC)', type: 'btc', help: 'Empty = always' },
    ],
    policy: 'risk',
    timelockHours: 24,
    governanceNote: 'Waits 24 h after approval: loosening a control must be visible before it bites.',
  },
  {
    id: 'security',
    group: 'Organisation',
    title: 'Security',
    subtitle: 'How the team signs in',
    kind: 'object',
    fields: [
      { key: 'sso', label: 'Single sign-on', type: 'select', options: ['Google Workspace', 'Okta', 'None'] },
      { key: 'mfaRequired', label: 'Two-factor required', type: 'bool' },
      { key: 'sessionHours', label: 'Session length', type: 'hours' },
      { key: 'ipAllowlist', label: 'IP allowlist', type: 'tags', help: 'Empty = any address' },
    ],
    policy: 'settings',
    timelockHours: 0,
    governanceNote: 'Applies as soon as it is approved.',
  },

  // ── PRODUCT ───────────────────────────────────────────────────────────────
  {
    id: 'terms',
    group: 'Product',
    title: 'Product terms',
    subtitle: 'What every new offer starts from — an offer keeps the version it was born with',
    kind: 'object',
    fields: [
      { key: 'minTicketUsdc', label: 'Minimum ticket', type: 'usd' },
      { key: 'lockupOptions', label: 'Lockups offered', type: 'tags', help: 'In months, e.g. 12, 24, 36' },
      { key: 'defaultLockupMonths', label: 'Default lockup', type: 'months' },
      { key: 'rewardsCadence', label: 'Rewards', type: 'select', options: ['monthly', 'quarterly'] },
      { key: 'managementFeeBps', label: 'Management fee', type: 'bps', help: 'Per year, on the reserve' },
      { key: 'performanceFeeBps', label: 'Performance fee', type: 'bps', help: 'On rewards' },
    ],
    policy: 'risk',
    timelockHours: 24,
    governanceNote: 'Waits 24 h after approval. Offers already sent keep their terms.',
  },
  {
    /* V2 — Mining as a Service : plus de bande de dérive ni de protocole. Les
       règles qui comptent sont celles du buffer qui paie l'électricité. */
    id: 'limits',
    group: 'Product',
    title: 'Mining & buffer',
    subtitle: 'How every deposit is split, and when the electricity buffer is refilled',
    kind: 'object',
    fields: [
      { key: 'bufferBps', label: 'Electricity buffer', type: 'bps', help: 'Of each deposit, kept in USDC — the rest buys computing power' },
      { key: 'bufferFloorMonths', label: 'Refill below', type: 'months', help: 'Months of bills left in the buffer' },
      { key: 'bufferTargetMonths', label: 'Refill up to', type: 'months', help: 'Months of bills after a refill' },
      { key: 'refillCapBps', label: 'Refill cap', type: 'bps', help: 'Of the month’s mined bitcoin, at most' },
      { key: 'maxClientExposureUsd', label: 'Max per client', type: 'usd' },
    ],
    policy: 'risk',
    timelockHours: 24,
    governanceNote: 'Waits 24 h after approval. Existing vaults follow the new rules from the next month.',
  },

  // ── TREASURY ──────────────────────────────────────────────────────────────
  {
    id: 'addressBook',
    group: 'Treasury',
    title: 'Address book',
    subtitle: 'The only wallets bitcoin may be sent to — synced to the Fireblocks whitelist',
    kind: 'list',
    fields: [
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'label', label: 'Label', type: 'text' },
      { key: 'asset', label: 'Asset', type: 'select', options: ['BTC', 'USDC'] },
      { key: 'network', label: 'Network', type: 'select', options: ['Bitcoin', 'Ethereum', 'Base', 'Arbitrum'] },
      { key: 'address', label: 'Address', type: 'address', wide: true },
    ],
    policy: 'treasury',
    timelockHours: 48,
    governanceNote: 'A new address is usable 48 h after approval — the cooling period that stops a hijacked request.',
  },
  {
    id: 'payees',
    group: 'Treasury',
    title: 'Payees',
    subtitle: 'Who the platform pays — hosting and electricity for the fleet',
    kind: 'list',
    fields: [
      { key: 'name', label: 'Payee', type: 'text' },
      { key: 'purpose', label: 'Purpose', type: 'text', wide: true },
      { key: 'asset', label: 'Asset', type: 'select', options: ['USDC', 'BTC'] },
      { key: 'address', label: 'Address', type: 'address', wide: true },
      { key: 'schedule', label: 'Schedule', type: 'select', options: ['monthly', 'quarterly'] },
    ],
    policy: 'treasury',
    timelockHours: 48,
    governanceNote: 'Same cooling period as the address book: 48 h after approval.',
  },

  // ── CLIENTS ───────────────────────────────────────────────────────────────
  {
    id: 'compliance',
    group: 'Clients',
    title: 'KYC & AML',
    subtitle: 'What Sumsub checks, and what blocks a client',
    kind: 'object',
    fields: [
      { key: 'level', label: 'Sumsub level', type: 'text' },
      { key: 'reverifyMonths', label: 'Re-verify every', type: 'months' },
      { key: 'blockedJurisdictions', label: 'Blocked jurisdictions', type: 'tags' },
      { key: 'amlBlockAt', label: 'AML blocks at', type: 'select', options: ['low', 'medium', 'high'] },
      { key: 'blockOnFlag', label: 'Freeze on a new flag', type: 'bool', help: 'Ongoing monitoring' },
    ],
    policy: 'settings',
    timelockHours: 0,
    governanceNote: 'Applies as soon as it is approved.',
  },
  {
    id: 'templates',
    group: 'Clients',
    title: 'Email templates',
    subtitle: 'The four journey emails, and the HubSpot deal stage each one moves to',
    kind: 'list',
    fixedRows: true,
    fields: [
      { key: 'label', label: 'Email', type: 'readonly' },
      { key: 'subject', label: 'Subject', type: 'text', wide: true },
      { key: 'hubspotStage', label: 'HubSpot stage', type: 'text' },
      { key: 'intro', label: 'Opening line', type: 'textarea', wide: true },
    ],
    policy: 'settings',
    timelockHours: 0,
    governanceNote: 'Applies as soon as it is approved. Emails already sent are not touched.',
  },

  // ── PLATFORM ──────────────────────────────────────────────────────────────
  {
    id: 'notifications',
    group: 'Platform',
    title: 'Notifications',
    subtitle: 'Who hears about what, and where',
    kind: 'list',
    fields: [
      { key: 'event', label: 'When', type: 'text', wide: true },
      { key: 'notify', label: 'Who', type: 'tags', options: ROLES },
      { key: 'channels', label: 'Where', type: 'tags', options: ['Slack', 'Email', 'SMS'] },
    ],
    policy: 'settings',
    timelockHours: 0,
    governanceNote: 'Applies as soon as it is approved.',
  },
]

export const sectionOf = (id: string) => SECTIONS.find((s) => s.id === id) ?? null

/** Le sous-menu de Settings, dans l'ordre — les sections du schéma, plus les pages à part. */
export type NavItem = Readonly<{ href: string; label: string }>
export type NavGroup = Readonly<{ title: string; items: readonly NavItem[] }>

const itemsOf = (group: SectionGroup): NavItem[] =>
  SECTIONS.filter((s) => s.group === group).map((s) => ({ href: `/admin/settings/${s.id}`, label: s.title }))

export const SETTINGS_NAV: readonly NavGroup[] = [
  { title: '', items: [{ href: '/admin/settings', label: 'Overview' }] },
  { title: 'Organisation', items: itemsOf('Organisation') },
  { title: 'Product', items: itemsOf('Product') },
  { title: 'Treasury', items: itemsOf('Treasury') },
  { title: 'Clients', items: itemsOf('Clients') },
  {
    title: 'Platform',
    items: [
      { href: '/admin/settings/integrations', label: 'Integrations' },
      ...itemsOf('Platform'),
      { href: '/admin/settings/audit', label: 'Audit log' },
    ],
  },
  {
    title: 'Developer',
    items: [
      { href: '/admin/settings/developer/service', label: 'Service' },
      { href: '/admin/settings/developer/api', label: 'API explorer' },
      { href: '/admin/settings/developer/keeper', label: 'Keeper' },
    ],
  },
]

/** Les changements : une demande, ses approbations, son délai, son application. */
export type ChangeStatus = 'pending' | 'scheduled' | 'applied' | 'rejected' | 'cancelled'

export type SettingsChange = Readonly<{
  id: string
  section: string
  reason: string
  author: string
  createdAt: string
  status: ChangeStatus
  required: number
  approvals: readonly Readonly<{ by: string; at: string }>[]
  rejectedBy: string | null
  effectiveAt: string | null
  before: unknown
  after: unknown
}>

export type TeamMember = Readonly<{ id: string; name: string; email: string; role: string; twoFactor: boolean; status: string }>

export type SettingsState = Readonly<{
  values: Readonly<Record<string, unknown>>
  changes: readonly SettingsChange[]
  /** Les rôles autorisés à approuver, par règle (`settings`, `risk`, `treasury`). */
  approverRoles: Readonly<Record<string, readonly string[]>>
}>

export type AuditEntry = Readonly<{
  id: string
  at: string
  actor: string
  action: string
  target: string
  detail: string | null
  category: 'settings' | 'decision' | 'offer' | 'payment' | 'email' | 'compliance' | 'client'
}>
