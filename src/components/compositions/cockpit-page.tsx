import clsx from 'clsx'

/**
 * CockpitPage — grammaire de mise en page pour les écrans d’exploitation.
 *
 * Une page cockpit suit toujours la même ossature :
 *   ① en-tête · ② bandeau KPI · ③ graphique principal (+ contexte latéral)
 *   · ④ suites (tables, sections) — chaque zone à un seul niveau de surface.
 *
 * Règles encodées ici :
 * - le graphique vit seul dans `primaryChart` — jamais dans une `SectionCard` ;
 * - le contexte textuel vit dans `aside` (`SectionCard tone="plain"` en général) ;
 * - la grille suit le conteneur (`@container`), pas la largeur fenêtre ;
 * - `data-cockpit-chart` marque le slot graphique pour les revues et e2e.
 */

export function CockpitPage({
  header,
  kpis,
  primaryChart,
  aside,
  secondaryChart,
  children,
  className,
}: Readonly<{
  /** `AdminPageHeader` — un seul h1 par page. */
  header: React.ReactNode
  /** `StatGrid` et ses `StatCard`. */
  kpis: React.ReactNode
  /** `ChartFrame` seul — une seule bordure de graphique. */
  primaryChart: React.ReactNode
  /** Contexte latéral : listes, statuts, `SectionCard` plain. */
  aside?: React.ReactNode
  /** Second graphique pleine largeur, optionnel. */
  secondaryChart?: React.ReactNode
  /** Tables et sections sous la rangée principale. */
  children?: React.ReactNode
  className?: string
}>) {
  return (
    <div className={clsx('space-y-10', className)}>
      {header}
      {kpis}

      <div className="@container">
        <div
          className={clsx(
            'grid grid-cols-1 gap-6',
            aside !== undefined && '@[46rem]:grid-cols-3',
          )}
        >
          <div
            className={clsx('min-w-0', aside !== undefined && '@[46rem]:col-span-2')}
            data-cockpit-chart="primary"
          >
            {primaryChart}
          </div>
          {aside !== undefined ? <div className="min-w-0">{aside}</div> : null}
        </div>
      </div>

      {secondaryChart !== undefined ? (
        <div data-cockpit-chart="secondary">{secondaryChart}</div>
      ) : null}

      {children !== undefined ? <div className="space-y-10">{children}</div> : null}
    </div>
  )
}
