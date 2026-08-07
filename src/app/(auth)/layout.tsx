import { AuthLayout } from '@/components/catalyst/auth-layout'

export default function AuthRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-dvh lg:bg-zinc-950">
      <AuthLayout>{children}</AuthLayout>
    </div>
  )
}
