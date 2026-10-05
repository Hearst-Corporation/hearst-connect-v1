import { Button } from '@hearst/ui/catalyst/button'
import type { ReactNode } from 'react'

type CtaProps = Readonly<{ href: string; children: ReactNode }>

export function MarketingPrimaryLink({ href, children }: CtaProps) {
  return (
    <Button color="accent" href={href}>
      {children}
    </Button>
  )
}

export function MarketingSecondaryLink({ href, children }: CtaProps) {
  return (
    <Button plain href={href}>
      {children}
    </Button>
  )
}

export function MarketingSignInLink() {
  return <MarketingPrimaryLink href="/login">Sign in</MarketingPrimaryLink>
}
