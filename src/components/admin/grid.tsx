import { gridGap } from '@/lib/layout-tokens'
import clsx from 'clsx'

/**
 * The admin **Bento grid** — a composable 12-column layout.
 *
 * A card is not sized by its dataset; it is placed by the composition. The
 * grid owns twelve equal tracks and each card claims a span (full / two-thirds
 * / one-third / half). This is what lets a section read as a real cockpit —
 * a dominant 2⁄3 card beside a bounded 1⁄3 flank, a symmetric 50⁄50 pair, a
 * full-width band — instead of a masonry of equal columns where every card,
 * data-rich or nearly empty, takes the same slot.
 *
 * `DATASET SIZE DOES NOT OWN PAGE GEOMETRY` (rule 60): the span is declared by
 * the author from the card's ROLE in the section, never derived from how many
 * rows the source returned today. A three-row list and a thirty-row list in the
 * same role produce the same span — the page does not jump with the data.
 *
 * The track count follows the CONTAINER, not the viewport (`@container` +
 * `@[Nrem]:`), because the dashboard lives inside the main whose width the rail
 * (16rem) + padding already shrank — no viewport breakpoint describes it. Below
 * the threshold every card is full-width (one readable column); above it, the
 * twelve tracks open and spans take effect.
 *
 * Threshold = 56rem: the tightest span is the 1/3 flank (`span={4}`). At
 * 48rem the tracks opened while the flank was still ~240px — crushed table
 * and chart. 56rem keeps the flank ≥ ~280px of track, and with the rail +
 * card chrome that means the split opens around a ~1200px viewport.
 */
export function BentoGrid({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: Readonly<{
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <div className="@container min-w-0">
      <Tag
        {...rest}
        className={clsx(
          // 1 column when narrow → 12 composable tracks when the container has room.
          // items-stretch : deux cartes côte à côte ont TOUJOURS la même hauteur —
          // une carte plus courte à côté d'une plus haute laissait un trou sous
          // elle, et la rangée se lisait comme cassée.
          'grid min-w-0 grid-cols-1 items-stretch @[56rem]:grid-cols-12',
          gridGap,
          className,
        )}
      >
        {children}
      </Tag>
    </div>
  )
}

/**
 * One card in the Bento grid.
 *
 * `span` is the card's share of the twelve tracks ABOVE the container
 * threshold — below it every card is full width (a single readable column).
 * The span is a ROLE decision (dominant vs flank, symmetric pair, full band),
 * not a function of the data volume.
 *
 *   12 → full-width band
 *    8 → two-thirds (dominant)          4 → one-third (bounded flank)
 *    6 → half (symmetric pair)
 */
const SPAN_CLASS: Record<BentoSpan, string> = {
  12: '@[56rem]:col-span-12',
  8: '@[56rem]:col-span-8',
  6: '@[56rem]:col-span-6',
  4: '@[56rem]:col-span-4',
}

export type BentoSpan = 12 | 8 | 6 | 4

export function BentoCard({
  children,
  className,
  span = 6,
  as: Tag = 'div',
  bare = false,
  ...rest
}: Readonly<{
  /** La cellule porte déjà sa propre carte : ne pas en ajouter une seconde. */
  bare?: boolean
  children: React.ReactNode
  className?: string
  span?: BentoSpan
  as?: 'div' | 'section' | 'article'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  /* `bare` : une cellule qui porte déjà sa propre carte (`DashCard`,
     `DataTableShell`) ne doit pas en recevoir une seconde — un cadre dans un
     cadre. Partout ailleurs, la cellule EST la carte : même fond, même rayon,
     même filet que les cartes de /account, sans quoi la console affichait du
     contenu posé à nu sur le fond de page. */
  return (
    <Tag
      {...rest}
      className={clsx(
        'min-w-0',
        !bare && 'rounded-[var(--ud-radius)] bg-[var(--ud-card)] p-[var(--ud-pad-card)] ring-1 ring-[var(--ud-line)]',
        /* Une cellule dont l'enfant direct est DÉJÀ une carte (`DashCard`,
           `data-surface="box"`) perd son propre cadre : sans cela, chaque page
           qui oubliait `bare` affichait une carte dans une carte. */
        !bare &&
          'has-[>[data-surface=box]]:bg-transparent has-[>[data-surface=box]]:p-0 has-[>[data-surface=box]]:ring-0',
        /* La carte enfant prend toute la hauteur de la rangée, `bare` ou non :
           deux cartes côte à côte finissent à la même ligne. */
        '[&>[data-surface=box]]:h-full',
        // Une cellule `bare` porte sa propre carte : la carte prend toute la
        // hauteur de la rangée.
        bare && '[&>*]:h-full',
        SPAN_CLASS[span],
        className,
      )}
    >
      {children}
    </Tag>
  )
}
