import { gcc, Reading } from '@/components/layout/console'
import type { Availability } from '@/lib/vaults/model'
import { Panel } from '@/components/compositions/panel'
import clsx from 'clsx'

/**
 * Les figures : la valeur mise en avant, le fait secondaire, et la carte de KPI.
 *
 * ── Ce que ces trois composants remplacent ────────────────────────────────
 * `HeroFigure` était redéclaré dans 6 routes et `SideFact` dans 4, avec le même
 * corps à la mise en forme près. `ClientsMetric` (clients) et
 * `ComplianceMetric` (conformité) étaient identiques au nom près.
 *
 * ── Pourquoi deux entrées et pas une ──────────────────────────────────────
 * `MetricValue` prend une chaîne DÉJÀ formatée : plusieurs routes calculent une
 * valeur qui n'est pas une `Availability` (un libellé éditorial, un compte
 * dérivé). `MetricCard` prend une `Availability` et délègue à `Reading`, qui
 * est le seul chemin par lequel une absence devient un état nommé plutôt qu'un
 * zéro. Fusionner les deux obligerait à accepter une chaîne « — » comme si
 * c'était une mesure, ce que la doctrine de véracité interdit.
 */

/**
 * Une figure mise en avant : la valeur, puis ce qu'elle mesure.
 *
 * `unite` est facultative — `series-1` déclarait sa propre copie sans elle,
 * ce qui était la seule différence entre les six variantes locales.
 */
export function MetricValue({
  valeur,
  libelle,
  unite,
}: Readonly<{ valeur: string; libelle: string; unite?: string }>) {
  return (
    <div>
      <p className={gcc.metricValue}>{valeur}</p>
      <p className={gcc.cellText}>
        {libelle}
        {unite === undefined || unite === '' ? '' : ` · ${unite}`}
      </p>
    </div>
  )
}

/** Un fait secondaire : le libellé au-dessus, la valeur en dessous. */
export function SideFact({ libelle, valeur }: Readonly<{ libelle: string; valeur: string }>) {
  return (
    <div>
      <p className={gcc.cellText}>{libelle}</p>
      <p className={gcc.cellStrong}>{valeur}</p>
    </div>
  )
}

/**
 * Une carte de KPI adossée à une `Availability`.
 *
 * Le titre est un `h2` par défaut : ces cartes sont les premiers repères d'une
 * page sous le `h1` du shell. L'appelant peut descendre le niveau quand la
 * carte vit à l'intérieur d'une section qui porte déjà son titre — le plan du
 * document reste lisible au lecteur d'écran.
 *
 * La valeur passe par `Reading` : si l'`Availability` est indisponible, c'est
 * un état nommé qui s'affiche, jamais un zéro ni un tiret muet.
 */
export function MetricCard({
  titre,
  valeur,
  as: Tag = 'h2',
  showRoute = false,
  className,
}: Readonly<{
  titre: string
  valeur: Availability<string>
  as?: 'h2' | 'h3'
  /** Affiche la route backend qui répondrait, quand la valeur est absente. */
  showRoute?: boolean
  className?: string
}>) {
  return (
    <Panel tone="metric" className={className}>
      <Tag>{titre}</Tag>
      <div className={gcc.metricText}>
        <Reading value={valeur} className={gcc.metricValue} showRoute={showRoute} />
      </div>
    </Panel>
  )
}

/**
 * La rangée de KPI — le conteneur des `MetricCard`.
 *
 * `aria-label` est OBLIGATOIRE : une rangée de chiffres sans nom ne dit rien à
 * qui navigue par régions. Les routes qui composaient cette rangée à la main
 * l'oubliaient une fois sur deux.
 */
export function KpiRow({
  children,
  label,
  className,
}: Readonly<{ children: React.ReactNode; label: string; className?: string }>) {
  return (
    <section className={clsx(gcc.metricsRow, className)} aria-label={label}>
      {children}
    </section>
  )
}
