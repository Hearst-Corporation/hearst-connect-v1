import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import styles from './console.module.css'
import clsx from 'clsx'

/**
 * The laboratory's shared primitives: the panel material, and the one way an
 * absence is rendered inside this composition.
 *
 * The console's own `SourceAvailabilityBadge` is deliberately NOT reused here.
 * It is a Catalyst-styled badge built for the graphite console — dropped onto
 * this near-black prototype it reads as a foreign element and, worse, its
 * padding would break the 7px caption rhythm the reference geometry depends
 * on. The CONTRACT it enforces is what matters, and that contract is kept:
 * an absence shows the word, the reason and the route, and never a number.
 */

export function Panel({
  children,
  className,
  as: Tag = 'article',
  ...rest
}: Readonly<{
  children?: React.ReactNode
  className?: string
  as?: 'article' | 'section' | 'aside' | 'div'
  /**
   * Stable geometry anchor. The visual review measures the box of every
   * structural element against the reference prototype; addressing them by
   * CSS-module class name would break the moment a hash changes, so each
   * structural element carries an explicit name instead.
   */
  'data-gcc'?: string
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag {...rest} className={clsx(styles.panel, className)}>
      {children}
    </Tag>
  )
}

/**
 * A named absence — rendered with Catalyst's `Badge`.
 *
 * ── Why the kit and not a hand-drawn pill ─────────────────────────────────
 * This used to be a `<span>` at 8px with a `::before` dot drawn in CSS: the
 * single most important string on the screen ("Unavailable", "Not exposed")
 * was also its least legible. `Badge` renders it at 12px with a real
 * background from the theme, and it is a component the whole product already
 * shares — one less pill to maintain.
 *
 * The route keeps its own line, in Catalyst's `Text`, so the reader gets the
 * endpoint that would answer the missing figure.
 *
 * `onAccent` still exists: on the light accent card a `zinc` badge would sit
 * light-on-light, so the ink flips there.
 */
export function Absent({
  availability,
  onAccent = false,
  showRoute = false,
}: Readonly<{ availability: Availability<unknown>; onAccent?: boolean; showRoute?: boolean }>) {
  if (isAvailable(availability)) return null
  const { reason, endpoint, status } = availability
  const route = [endpoint, reason].filter((part) => part !== null && part !== '').join(' · ')
  return (
    <span className={styles.absentBlock}>
      <Badge color="zinc" className={clsx(onAccent && styles.absentOnAccent)}>
        {status === 'NOT_EXPOSED' ? 'Non exposé' : 'Indisponible'}
      </Badge>
      {showRoute && route !== '' && (
        <Text className={clsx(styles.absentRoute, onAccent && styles.absentOnAccent)}>{route}</Text>
      )}
    </span>
  )
}

/**
 * A reading, or its absence — the only way a figure reaches the screen in this
 * composition. There is no third branch and no default value, which is what
 * makes "a count nobody can make never renders as zero" structural here rather
 * than a habit.
 */
export function Reading({
  value,
  className,
  onAccent = false,
  showRoute = false,
}: Readonly<{
  value: Availability<string>
  className?: string
  onAccent?: boolean
  showRoute?: boolean
}>) {
  if (!isAvailable(value)) return <Absent availability={value} onAccent={onAccent} showRoute={showRoute} />
  return <span className={clsx(styles.metricValue, className)}>{value.value}</span>
}

export { styles as gcc }
