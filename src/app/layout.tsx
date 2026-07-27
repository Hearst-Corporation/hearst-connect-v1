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
    <html lang="fr" className="text-zinc-950 antialiased dark:bg-zinc-900 dark:text-white">
      <head>
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </head>
      <body>{children}</body>
    </html>
  )
}
