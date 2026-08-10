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
  // Startup guardrail. Every page goes through this layout: it is the first
  // server-render point common to the whole application. The function never
  // throws and logs only once per worker (module-scope lock) — rendering is
  // neither blocked nor slowed down by an incomplete configuration.
  announceConfigurationOnce()

  return (
    <html
      lang="en"
      // Dark forced on the server side + init script (purges any residual .light).
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
