import { AuthLayout } from '@/components/catalyst/auth-layout'

export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:bg-zinc-100 dark:lg:bg-zinc-950">
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
