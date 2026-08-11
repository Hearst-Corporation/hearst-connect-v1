import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Command center · Hearst Connect' },
}

/**
 * Legacy `/espace-utilisateur` tree — pages only redirect to `/account`.
 * Session chrome lives on the canonical `/account` layout.
 */
export default function EspaceUtilisateurLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}
