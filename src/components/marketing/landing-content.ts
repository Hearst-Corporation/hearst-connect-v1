import {
  ArrowPathIcon,
  DocumentTextIcon,
  FingerPrintIcon,
  KeyIcon,
  LockClosedIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/20/solid'
import { Squares2X2Icon, UsersIcon } from '@heroicons/react/24/outline'
import type { ComponentType, SVGProps } from 'react'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export const LOGIN_HREF = '/login' as const
export const REGISTER_HREF = '/register' as const

export const domainBadges = ['Access', 'Vaults', 'Compliance', 'Operations', 'Product'] as const

export const primaryFeatures = [
  {
    name: 'Unified access',
    description:
      'Manage identities, permissions, and access logs from one console. Each member sees only what their role allows.',
    href: LOGIN_HREF,
    icon: KeyIcon,
  },
  {
    name: 'Vault oversight',
    description:
      'Track vault status, contract addresses, and indexed movements. An empty series stays empty; unavailability is shown as such.',
    href: LOGIN_HREF,
    icon: Squares2X2Icon,
  },
  {
    name: 'Compliance surface',
    description:
      'Client files and watchpoints raised by Hearst services, with traceable status. No forced green badge when the backend confirms nothing.',
    href: LOGIN_HREF,
    icon: ShieldCheckIcon,
  },
] as const satisfies ReadonlyArray<{
  name: string
  description: string
  href: string
  icon: Icon
}>

export const platformCapabilities = [
  {
    name: 'Backend-sourced data',
    description: 'Every value comes from the Hearst API on Railway — an absence stays an absence.',
    icon: ServerIcon,
  },
  {
    name: 'Encrypted sessions',
    description: 'HttpOnly session cookie carries identity and bearer token — never readable client-side.',
    icon: LockClosedIcon,
  },
  {
    name: 'Attributable audit',
    description: 'Sign-ins and movements are timestamped. Audit reads as-is, without reconstructing history.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Role governance',
    description: 'Owner, admin, and member postures are explicit — including MFA and policy exceptions.',
    icon: FingerPrintIcon,
  },
  {
    name: 'Workspace members',
    description: 'Invite, revoke, and review who can open each Hearst workspace from one place.',
    icon: UsersIcon,
  },
  {
    name: 'Operations journal',
    description: 'Product, runtime, and compliance consoles share the same source of truth.',
    icon: DocumentTextIcon,
  },
] as const satisfies ReadonlyArray<{
  name: string
  description: string
  icon: Icon
}>

/** Product principles — distinct from feature lists above. */
export const doctrinePillars = [
  {
    icon: ServerIcon,
    title: 'Explicit availability',
    desc: 'Unavailable, empty, and partial backend responses stay labeled — never swapped for a measured zero.',
  },
  {
    icon: LockClosedIcon,
    title: 'Session integrity',
    desc: 'Identity and bearer tokens remain inside encrypted httpOnly sessions, off the client surface.',
  },
  {
    icon: Squares2X2Icon,
    title: 'Domain separation',
    desc: 'Access, vaults, compliance, and operations stay distinct consoles behind one Hearst sign-in.',
  },
] as const satisfies ReadonlyArray<{
  icon: Icon
  title: string
  desc: string
}>
