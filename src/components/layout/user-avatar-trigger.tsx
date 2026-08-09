'use client'

import { Avatar } from '@/components/catalyst/avatar'

export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function NavbarAvatar({ initials }: Readonly<{ initials: string }>) {
  return <Avatar initials={initials || 'HC'} square alt="" />
}

export function SidebarFooterIdentity({
  initials,
  name,
  email,
}: Readonly<{ initials: string; name: string; email: string }>) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar initials={initials || 'HC'} className="size-10" square alt="" />
      <span className="min-w-0">
        <span className="block truncate text-sm/5 font-medium text-ink dark:text-fg">{name}</span>
        <span className="block truncate text-xs/5 font-normal text-fg-tertiary dark:text-fg-secondary">
          {email}
        </span>
      </span>
    </span>
  )
}
