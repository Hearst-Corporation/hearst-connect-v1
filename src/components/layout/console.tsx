import { etatBackend, libelleEtatBackend } from '@/lib/backend/lecture-etat'
import { isAvailable, signalOf, type Availability } from '@/lib/vaults/model'
import { Badge } from '@/components/catalyst/badge'
import { Text } from '@/components/catalyst/text'
import styles from './console.module.css'
import clsx from 'clsx'

/**
 * The laboratory's shared primitives: the panel material, and the one way an
 * absence is rendered inside this composition.
 *
 * The console's own source-availability badge was deliberately NOT reused here.
 * It was a Catalyst-styled badge built for the graphite console — dropped onto
 * this near-black prototype it read as a foreign element. The CONTRACT it
 * enforced is what matters, and that contract is kept: an absence shows the
 * word, the reason and the route, and never a number.
 */

/*
 * `Panel` a été retiré d'ici le 2026-08-04 (HC-UI-CONVERGENCE-001).
 *
 * Il vit désormais dans `@/components/compositions/panel` — une seule surface
 * canonique pour toute la console, avec la matière déclarée par un `tone`
 * explicite au lieu d'un `className` deviné. Ce fichier ne garde que ce qui
 * relève vraiment de la matière de la console : la grammaire de l'absence
 * (`Absent`, `Reading`) et les classes du module CSS (`gcc`).
 *
 * L'ancre de géométrie `data-gcc` reste disponible : `Panel` accepte les
 * attributs HTML arbitraires, donc les revues visuelles qui mesurent les boîtes
 * par `[data-gcc='…']` continuent de fonctionner.
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
 * The route keeps its own line, in Catalyst's `Text`, so the reader gets the
 * endpoint that would answer the missing figure.
 *
 * `onAccent` still exists: on the light accent card a `zinc` badge would sit
 * light-on-light, so the ink flips there.
 */
function Absent({
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
  const signal = signalOf(value)
  if (signal === 'editorial') {
    return <span className={clsx(styles.metricValue, className)}>{value.value}</span>
  }
  const etat = etatBackend(value)
  return (
    <span className="inline-flex items-center gap-2">
      <span className={clsx(styles.metricValue, className)}>{value.value}</span>
      {etat === 'EN_DIRECT' ? (
        <Badge color="green" data-live-badge="">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
          {libelleEtatBackend(etat)}
        </Badge>
      ) : (
        <Badge color={etat === 'PROBLEME' ? 'amber' : 'zinc'} data-state-badge="">
          {libelleEtatBackend(etat)}
        </Badge>
      )}
    </span>
  )
}

export { styles as gcc }
