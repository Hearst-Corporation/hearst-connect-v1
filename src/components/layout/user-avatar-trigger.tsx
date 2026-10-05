'use client'

import { Avatar } from '@hearst/ui/catalyst/avatar'

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
        <span className="block truncate text-sm/5 font-medium text-(--ds-text)">{name}</span>
        <span className="block truncate text-xs/5 font-normal text-(--ds-text-subtle)">
          {email}
        </span>
      </span>
    </span>
  )
}
