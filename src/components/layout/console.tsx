import { backendStateFrom, backendStateLabel } from '@/lib/backend/reading-state'
import { readableReason } from '@/lib/movements'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'
import { AdminToneBadge, toneForBackendState } from '@/components/admin/status-tone'
import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import styles from './console.module.css'
import clsx from 'clsx'

/**
 * Shared console primitives for compositions: named absences (`Reading`) and
 * CSS module classes (`csl`). Not a route shell — account chrome uses SidebarLayout.
 */

/*
 * `Panel` lives in `@/components/compositions/panel` (PASS 2): its material is
 * `surfaceBox` (Tailwind tokens), and the csl tones carry geometry only.
 * Here: the absence grammar (`Absent`, `Reading`) plus the `csl` classes (geometry /
 * metric typography / states). `.panel` CSS-module is no longer the material of the boxes.
 */

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
 * Under the badge: a readable reason when we have one, else the endpoint that
 * would answer. Never a raw snake_case reason code in the UI.
 *
 * `onAccent` still exists: on the light accent card a `neutral` badge would sit
 * light-on-light, so the ink flips there.
 */
function Absent({
  availability,
  onAccent = false,
  showRoute = false,
}: Readonly<{ availability: Availability<unknown>; onAccent?: boolean; showRoute?: boolean }>) {
  if (isAvailable(availability)) return null
  const { reason, endpoint, status } = availability
  const readableMotif = readableReason(reason)
  // Doctrine: an unknown reason → say nothing rather than leak a technical code.
  const detail = [readableMotif, endpoint].filter((part): part is string => part !== null && part !== undefined && part !== '')
  const detailLine = detail.join(' · ')
  return (
    <span className={styles.absentBlock}>
      <Badge color="neutral" className={clsx(onAccent && styles.absentOnAccent)}>
        {status === 'NOT_EXPOSED' ? 'Not exposed' : 'Unavailable'}
      </Badge>
      {showRoute && detailLine !== '' && (
        <Text className={clsx(styles.absentRoute, onAccent && styles.absentOnAccent)}>{detailLine}</Text>
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
  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <span className={clsx(styles.metricValue, className)}>{value.value}</span>
  }
  const state = backendStateFrom(value)
  return (
    <span className="inline-flex items-center gap-2">
      <span className={clsx(styles.metricValue, className)}>{value.value}</span>
      <AdminToneBadge
        tone={toneForBackendState(state)}
        showDot={state === 'LIVE'}
        data-live-badge={state === 'LIVE' ? '' : undefined}
        data-state-badge={state === 'LIVE' ? undefined : ''}
      >
        {backendStateLabel(state)}
      </AdminToneBadge>
    </span>
  )
}

export { styles as csl }
