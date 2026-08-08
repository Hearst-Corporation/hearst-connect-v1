import '@/styles/tailwind.css'
import { announceConfigurationOnce } from '@/lib/env'
import { fontSatoshi } from '@/lib/fonts'
import { THEME_INIT_SCRIPT } from '@/lib/theme'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s · Hearst Connect',
    default: 'Hearst Connect — unified access to Hearst spaces',
  },
  description:
    'Hearst Connect federates identities, permissions, and access logs across Hearst Corporation workspaces.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Garde-fou de démarrage. Toute page passe par ce layout : c'est le premier
  // point de rendu serveur commun à l'application. La fonction ne lève pas et
  // ne journalise qu'une fois par worker (verrou en portée module) — le rendu
  // n'est ni bloqué ni ralenti par une configuration incomplète.
  announceConfigurationOnce()

  return (
    <html
      lang="en"
      // Dark forcé côté serveur + script d’init (purge d’un éventuel .light résiduel).
      suppressHydrationWarning
      className={`dark ${fontSatoshi.variable} ${fontSatoshi.className} font-sans bg-console-app text-white antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
