import '@/styles/tailwind.css'
import { fontSatoshi } from '@/lib/fonts'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
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
    <html
      lang="fr"
      // Le script de thème ajoute `light`/`dark` sur cet élément avant
      // l'hydratation : l'écart de className avec le HTML serveur est voulu.
      suppressHydrationWarning
      className={`${fontSatoshi.variable} font-sans text-zinc-950 antialiased dark:bg-zinc-900 dark:text-white`}
    >
      <head>
        {/* Applique le thème mémorisé avant la première peinture (pas de flash). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
