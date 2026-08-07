import { AuthLayout } from '@/components/catalyst/auth-layout'

export default function AuthRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-dvh bg-console-app">
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
