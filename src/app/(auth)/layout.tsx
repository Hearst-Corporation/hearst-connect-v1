import { AuthSplit } from '@/components/auth-split'

/* L'entrée du produit : le panneau de marque animé, puis le formulaire. */
export default function AuthRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthSplit>{children}</AuthSplit>
}
