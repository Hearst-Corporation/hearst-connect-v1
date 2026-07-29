import { gcc } from './primitives'
import clsx from 'clsx'
import Link from 'next/link'

/**
 * The vertical rail — 68px, flush to the left edge, full height.
 *
 * The reference rail is five decorative glyph buttons that do nothing. This one
 * carries the console's REAL five primary destinations, so the laboratory can
 * be judged as a navigation shell and not only as a picture. The geometry
 * (68px width, 70px brand block, 58px rows, the four-stop vertical gradient,
 * the 6px footer caption) is the reference's, unchanged.
 *
 * Glyphs are kept as the reference's monochrome symbols rather than Heroicons:
 * swapping in the console's icon set would change the optical weight of the
 * rail and make the pixel comparison meaningless at this stage. The migration
 * is where real icons land.
 */

export type RailDestination = Readonly<{
  href: string
  label: string
  glyph: string
  current?: boolean
}>

export function GreenCommandRail({
  destinations,
  caption = 'HEARST CONNECT',
}: Readonly<{ destinations: readonly RailDestination[]; caption?: string }>) {
  return (
    <aside className={gcc.rail} aria-label="Primary navigation" data-gcc="rail">
      <Link href="/admin" className={gcc.brand} aria-label="Hearst Connect administration home" data-gcc="brand">
        ₿
      </Link>
      <nav aria-label="Console destinations">
        {destinations.map((destination) => (
          <Link
            key={destination.href}
            href={destination.href}
            className={clsx(gcc.railBtn, destination.current === true && gcc.railActive)}
            aria-label={destination.label}
            aria-current={destination.current === true ? 'page' : undefined}
          >
            <span aria-hidden="true">{destination.glyph}</span>
          </Link>
        ))}
      </nav>
      <div className={gcc.railCaption}>{caption}</div>
    </aside>
  )
}
