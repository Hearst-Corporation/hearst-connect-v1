import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Dashboard control container.
 * Card material = `surfaceBox` (PASS 2 canon) — not a second glass layer.
 */
export function DashboardShell({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  // Cockpit, not editorial: no reading-measure cap — the bento tracks and
  // container queries own the geometry at every width, the shell fills the
  // content card.
  return (
    <div className={clsx('flex w-full min-w-0 flex-col gap-6', className)}>{children}</div>
  )
}

/**
 * DashCard — semantic dashboard CARD.
 *
 * Same `surfaceBox` material as `Panel`; height intrinsic to the content.
 */
export function DashCard({
  children,
  className,
  contentClassName,
  title,
  eyebrow,
  titleLevel = 3,
  subtitle,
  action,
}: Readonly<{
  children?: ReactNode
  className?: string
  contentClassName?: string
  title?: string
  /**
   * Le surtitre en CAPITALES, au-dessus du titre — « YOUR POSITION »,
   * « YOUR VAULT » sur /account. Il dit de quoi le bloc relève, quand le
   * titre nomme la chose elle-même.
   */
  eyebrow?: string
  // A card lives under a section's `h2` (SectionHeader) → its own title is an
  // `h3` by default, so the document keeps a real heading hierarchy instead of
  // a flat wall of sibling `h2`s.
  titleLevel?: 2 | 3
  subtitle?: string
  /** Quiet link/action on the title row — replaces the bordered footer strip. */
  action?: ReactNode
}>) {
  return (
    <section data-surface="box" className={clsx(surfaceBox, 'flex min-w-0 flex-col', className)}>
      {/* L'en-tête de /account, à l'identique : surtitre en capitales, titre,
          phrase descriptive — puis un filet qui le sépare du contenu. Padding
          de 20px (`--ud-pad-card`), le même que ses cartes ; la console en
          portait 16. */}
      {title !== undefined ? (
        <header className="flex items-start justify-between gap-3 border-b border-[var(--ud-line)] p-[var(--ud-pad-card)]">
          <div className="min-w-0">
            {eyebrow !== undefined ? (
              <p className="mb-[7px] text-[11px] font-medium tracking-[0.14em] text-[var(--ud-fg-3)] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <Subheading level={titleLevel}>{title}</Subheading>
            {/* 11px gris : `Text` rend 14px par défaut, ce qui donnait au
                descriptif le même poids qu'un contenu. */}
            {subtitle !== undefined ? (
              <p className="mt-[3px] text-[12px] leading-snug text-[var(--ud-fg-3)]">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div
        className={clsx('flex min-h-0 min-w-0 flex-col p-[var(--ud-pad-card)]', contentClassName)}
      >
        {children}
      </div>
    </section>
  )
}
