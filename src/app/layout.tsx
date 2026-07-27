import { THEME_INIT_SCRIPT } from '@/lib/theme'
import '@/styles/tailwind.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s · Hearst Connect',
    default: 'Hearst Connect — l’accès unifié aux espaces Hearst',
  },
  description:
    'Hearst Connect fédère les identités, les autorisations et les journaux d’accès des espaces de travail de Hearst Corporation.',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning className="bg-surface-page text-zinc-950 antialiased">
      <head>
        {/* Applique le thème mémorisé avant la première peinture (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
