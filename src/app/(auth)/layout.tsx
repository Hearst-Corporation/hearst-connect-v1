import { AuthLayout } from '@/components/catalyst/auth-layout'
import { ThemeToggle } from '@/components/theme-toggle'

export default function AuthRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-dvh lg:bg-zinc-100 dark:lg:bg-zinc-950">
      <ThemeToggle className="absolute top-4 right-4 z-10" />
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
