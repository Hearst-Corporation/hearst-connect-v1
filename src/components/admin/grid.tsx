import { gridGap } from '@/lib/layout-tokens'
import clsx from 'clsx'

/**
 * The admin **Bento grid** — a masonry of cards.
 *
 * Every earlier attempt fought the same losing battle: the dashboard cards have
 * radically unequal natural heights (a ten-row activity timeline next to a
 * two-line rebalancing summary), and *any* row-based grid has to choose between
 * two bad outcomes — let rows flow at intrinsic height and leave black holes
 * next to the tall card (`items-start`), or stretch the short card to match and
 * leave it half-empty (`items-stretch`). Both were rejected on screen.
 *
 * A masonry has no rows, so it has neither failure mode. Cards flow top-to-
 * bottom **down independent columns**; the next card starts where the previous
 * one ended, per column. No hole, no stretch, no card declaring a span.
 *
 * Implementation is CSS multi-column (`columns-*`), the one masonry primitive
 * that ships in every browser today:
 *
 * 1. **No card declares a size.** It drops into the shortest-so-far column
 *    automatically. `span={7}` per card — the thing that froze and crammed the
 *    old grid behind the rail — is gone entirely.
 *
 * 2. **Column count follows the container, not the viewport.** `@container` +
 *    `@[Nrem]:columns-*` — the dashboard lives in a column whose width depends
 *    on the rail (200px) and the aside (290px), which no viewport breakpoint
 *    describes. One column when narrow, two when there is room.
 *
 * The ladder:
 *   base (< 60rem container)  1 column
 *   @[60rem]                  2 columns, masonry flow
 *
 * ── One caveat of CSS columns, handled by the card ──────────────────────────
 * Multi-column can split a single element across a column break. `BentoCard`
 * carries `break-inside-avoid` so a card is never cut in half.
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
          // 1 column → 2 columns, masonry flow driven by container width.
          'columns-1 @[60rem]:columns-2',
          gridGap.replace('gap-', 'gap-x-'), // horizontal gutter between columns
          className,
        )}
      >
        {children}
      </Tag>
    </div>
  )
}

/**
 * One card in the masonry.
 *
 * There is no `wide` / `span` knob any more — the whole point of a masonry is
 * that cards are *not* sized by the author; they flow into whichever column is
 * shortest. A card only has to declare that it must not be split across a
 * column break, and to carry the vertical gap to the next card in its column.
 */
export function BentoCard({
  children,
  className,
  as: Tag = 'div',
  ...rest
}: Readonly<{
  children: React.ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag
      {...rest}
      className={clsx(
        className,
        // Never split a card across a column break; space the next card below it.
        'break-inside-avoid mb-6 min-w-0',
      )}
    >
      {children}
    </Tag>
  )
}
