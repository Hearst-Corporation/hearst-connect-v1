import { AuthLayout } from '@hearst/ui/catalyst/auth-layout'

export default function AuthRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-dvh bg-(--ds-surface)">
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
