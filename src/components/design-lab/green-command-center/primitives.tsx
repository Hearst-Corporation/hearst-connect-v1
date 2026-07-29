import { isAvailable, type Availability } from '@/lib/vaults/model'
import styles from './green-command-center.module.css'
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
 * A named absence.
 *
 * Renders "Unavailable", the service's own machine reason when it gave one,
 * and the endpoint that would answer it. `onAccent` switches the ink for the
 * mint decision card, where light-on-light would be unreadable.
 */
export function Absent({
  availability,
  onAccent = false,
  showRoute = true,
}: Readonly<{ availability: Availability<unknown>; onAccent?: boolean; showRoute?: boolean }>) {
  if (isAvailable(availability)) return null
  const { reason, endpoint, status } = availability
  return (
    <span>
      <span className={clsx(styles.absent, onAccent && styles.absentOnAccent)}>
        {status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'}
      </span>
      {showRoute && (endpoint !== null || reason !== null) && (
        <span className={clsx(styles.absentRoute, onAccent && styles.absentOnAccent)}>
          {[endpoint, reason].filter((part) => part !== null && part !== '').join(' · ')}
        </span>
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
  showRoute = true,
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
