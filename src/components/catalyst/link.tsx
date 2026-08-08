import NextLink, { type LinkProps } from 'next/link'
import React, { forwardRef } from 'react'

/**
 * Catalyst Link — rend `next/link` directement.
 *
 * Le wrapper Headless `DataInteractive` a été retiré (décision d'Adrien, 2026-08-08) : sous
 * Next 16 / React 19 il rendait un Fragment et faisait échouer le prerender statique
 * (« Passing props on Fragment » sur /register), ce qui cassait le build de production.
 */
export const Link = forwardRef(function Link(
  props: LinkProps & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>,
) {
  return <NextLink {...props} ref={ref} />
})
