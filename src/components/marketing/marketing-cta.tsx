import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { ComponentProps } from 'react'

const primaryClass =
  'rounded-md bg-accent-400 text-sm font-semibold text-accent-ink shadow-xs transition-colors hover:bg-accent-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400'

const secondaryClass = 'text-sm/6 font-semibold text-white transition-colors hover:text-accent-300'

type LinkProps = ComponentProps<typeof Link>

export function MarketingPrimaryLink({
  href,
  children,
  className,
  ...props
}: Readonly<LinkProps>) {
  return (
    <Link href={href} className={cn(primaryClass, 'px-3.5 py-2.5', className)} {...props}>
      {children}
    </Link>
  )
}

export function MarketingPrimaryLinkWide({
  href,
  children,
  className,
  ...props
}: Readonly<LinkProps>) {
  return (
    <Link href={href} className={cn(primaryClass, 'px-4 py-2.5', className)} {...props}>
      {children}
    </Link>
  )
}

export function MarketingSecondaryLink({
  href,
  children,
  className,
  ...props
}: Readonly<LinkProps>) {
  return (
    <Link href={href} className={cn(secondaryClass, className)} {...props}>
      {children}
    </Link>
  )
}

export function MarketingSignInLink({ className, ...props }: Readonly<Omit<LinkProps, 'href' | 'children'>>) {
  return (
    <MarketingPrimaryLink href="/login" className={className} {...props}>
      Sign in
    </MarketingPrimaryLink>
  )
}
