'use client'

import * as Headless from '@headlessui/react'
import clsx from 'clsx'
import { LayoutGroup, motion } from 'motion/react'
import React, { forwardRef, useId } from 'react'
import { TouchTarget } from './button'
import { Link } from './link'

export function Sidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
  return <nav {...props} className={clsx(className, 'flex h-full min-h-0 flex-col')} />
}

export function SidebarHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-col border-b border-ink/5 p-4 dark:border-console-line-soft [&>[data-slot=section]+[data-slot=section]]:mt-2.5'
      )}
    />
  )
}

export function SidebarBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-8'
      )}
    />
  )
}

export function SidebarFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-col border-t border-ink/5 p-4 dark:border-console-line-soft [&>[data-slot=section]+[data-slot=section]]:mt-2.5'
      )}
    />
  )
}

export function SidebarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  let id = useId()

  return (
    <LayoutGroup id={id}>
      <div {...props} data-slot="section" className={clsx(className, 'flex flex-col gap-0.5')} />
    </LayoutGroup>
  )
}

export function SidebarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return <hr {...props} className={clsx(className, 'my-4 border-t border-ink/5 lg:-mx-4 dark:border-console-line-soft')} />
}

export function SidebarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div aria-hidden="true" {...props} className={clsx(className, 'mt-8 flex-1')} />
}

export function SidebarHeading({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3 {...props} className={clsx(className, 'mb-1 px-2 text-xs/6 font-medium text-fg-tertiary dark:text-fg-secondary')} />
  )
}

export const SidebarItem = forwardRef(function SidebarItem(
  {
    current,
    className,
    children,
    ...props
  }: { current?: boolean; className?: string; children: React.ReactNode } & (
    | ({ href?: never } & Omit<Headless.ButtonProps, 'as' | 'className'>)
    | ({ href: string } & Omit<Headless.ButtonProps<typeof Link>, 'as' | 'className'>)
  ),
  ref: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
) {
  let classes = clsx(
    /* Aligné sur le rail de /account : 13px, gap de 11px, padding 10/12, et
       surtout un ÉTAT COURANT en pastille verte pleine — le seul aplat de
       marque de l'écran. La console portait un survol gris à peine visible sur
       le fond noir du rail, donc rien ne signalait où l'on se trouvait. */
    // Base
    'flex w-full items-center gap-[11px] rounded-xl px-3 py-2.5 text-left text-[13px] font-normal text-fg-secondary',
    // Leading icon/icon-only
    '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-fg-tertiary sm:*:data-[slot=icon]:size-5',
    // Trailing icon (down chevron or similar)
    '*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5 sm:*:last:data-[slot=icon]:size-4',
    // Avatar
    '*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
    // Survol franc : un voile à 5 % ne se voit pas sur un rail presque noir.
    'data-hover:bg-fg/8 data-hover:text-fg data-hover:*:data-[slot=icon]:fill-fg',
    'data-active:bg-fg/8 data-active:text-fg',
    // Courant : pastille mint pleine, encre sombre.
    'data-current:bg-[#9eea7a] data-current:font-medium data-current:text-[#06110a]',
    'data-current:*:data-[slot=icon]:fill-[#06110a]',
    // Survolée ou pressée, l'entrée courante GARDE son encre sombre : le survol
    // général passait texte et icône en blanc, illisibles sur le vert.
    'data-current:data-hover:bg-[#9eea7a] data-current:data-hover:text-[#06110a]',
    'data-current:data-hover:*:data-[slot=icon]:fill-[#06110a]',
    'data-current:data-active:bg-[#9eea7a] data-current:data-active:text-[#06110a]',
    '*:data-[slot=icon]:fill-fg-tertiary'
  )

  return (
    <span className={clsx(className, 'relative')}>
      {/* Plus de barre latérale : la pastille verte pleine marque déjà l'item
          courant, comme sur /account. Deux repères pour un même état se
          contredisaient visuellement. */}
      {typeof props.href === 'string' ? (
        <Headless.CloseButton
          as={Link}
          {...props}
          className={classes}
          data-current={current ? 'true' : undefined}
          ref={ref}
        >
          <TouchTarget>{children}</TouchTarget>
        </Headless.CloseButton>
      ) : (
        <Headless.Button
          {...props}
          className={clsx('cursor-default', classes)}
          data-current={current ? 'true' : undefined}
          ref={ref}
        >
          <TouchTarget>{children}</TouchTarget>
        </Headless.Button>
      )}
    </span>
  )
})

export function SidebarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={clsx(className, 'truncate')} />
}
