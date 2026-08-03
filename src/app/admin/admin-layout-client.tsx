'use client'

import type { SessionUser } from '@/lib/session'
import { usePathname } from 'next/navigation'
import { AdminShell } from './admin-shell'

/**
 * Routes already migrated to the green command center shell render directly.
 * Any remaining legacy route keeps the shared `AdminShell`.
 */
const GREEN_SHELL_ROUTES = new Set<string>([
  '/admin',
  '/admin/clients',
  '/admin/conformite',
  '/admin/operations',
  '/admin/administration',
  '/admin/dashboard',
  '/admin/runtime',
  '/admin/api-explorer',
  '/admin/keeper',
  '/admin/profile',
  '/admin/product',
  '/admin/series-1',
  '/admin/mining',
  '/admin/btc',
  '/admin/backtest',
  '/admin/vault',
  '/admin/administration/produit',
  '/admin/vaults',
])

export function AdminLayoutClient({
  user,
  children,
}: Readonly<{ user: SessionUser; children: React.ReactNode }>) {
  const pathname = usePathname()
  const isGreenShellRoute = GREEN_SHELL_ROUTES.has(pathname) || pathname.startsWith('/admin/vaults/')

  if (isGreenShellRoute) {
    return <>{children}</>
  }
  return <AdminShell user={user}>{children}</AdminShell>
}
