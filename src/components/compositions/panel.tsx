import { gcc } from '@/components/layout/console'
import clsx from 'clsx'

/**
 * Panel — la surface canonique de la console.
 *
 * ── Ce qu'il remplace ─────────────────────────────────────────────────────
 * Dix routes déclaraient leur propre `Card` locale. Neuf d'entre elles étaient
 * identiques au caractère près :
 *
 *   function Card({ children, className = '' }) {
 *     return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
 *   }
 *
 * La dixième (`operations`) composait `gcc.heroChart` au lieu de `gcc.wavePanel`.
 * Ce n'était donc pas dix besoins différents, mais un seul contrat recopié —
 * avec une variante de matière. `Panel` porte le contrat ; `tone` porte la
 * variante, explicitement.
 *
 * ── Le contrat ────────────────────────────────────────────────────────────
 * - une surface, une seule bordure : un panneau ne contient pas un second
 *   panneau pour se cadrer lui-même ;
 * - la matière vient des tokens de la console, jamais d'une couleur littérale ;
 * - l'élément HTML est choisi par l'appelant (`as`), parce qu'une carte de
 *   métrique n'est pas une section de page et que le plan du document doit
 *   rester lisible pour un lecteur d'écran.
 */

/** La matière du panneau. `wave` est la surface ordinaire, `chart` porte un graphique. */
export type PanelTone = 'wave' | 'chart' | 'metric' | 'signal' | 'plain'

const TONE_CLASS: Record<PanelTone, string | undefined> = {
  wave: gcc.wavePanel,
  chart: gcc.heroChart,
  metric: gcc.metricCard,
  signal: gcc.signalCard,
  // `plain` : la surface nue, quand l'appelant compose lui-même sa géométrie.
  plain: undefined,
}

export function Panel({
  children,
  className,
  tone = 'wave',
  as: Tag = 'article',
  ...rest
}: Readonly<{
  children?: React.ReactNode
  className?: string
  tone?: PanelTone
  as?: 'article' | 'section' | 'aside' | 'div'
}> &
  Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) {
  return (
    <Tag {...rest} className={clsx(gcc.panel, TONE_CLASS[tone], className)}>
      {children}
    </Tag>
  )
}

/**
 * PanelHeader — le bloc titre d'un panneau.
 *
 * Sept routes le redéclaraient sous le nom `CardHeader`, avec le même corps.
 * `hint` est la phrase qui dit ce que le panneau montre : elle est facultative
 * ici alors qu'elle était obligatoire dans les copies locales, parce que
 * plusieurs panneaux n'ont qu'un titre et devaient passer une chaîne vide.
 */
export function PanelHeader({
  title,
  hint,
  action,
  as: Tag = 'h3',
}: Readonly<{
  title: string
  hint?: string
  action?: React.ReactNode
  as?: 'h2' | 'h3' | 'h4'
}>) {
  return (
    <div className={gcc.heroHead}>
      <Tag className={gcc.cardTitle}>{title}</Tag>
      {hint === undefined || hint === '' ? null : <p className={gcc.cellText}>{hint}</p>}
      {action}
    </div>
  )
}

/** Le corps d'un panneau — l'espacement interne, déclaré une fois. */
export function PanelBody({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={clsx(gcc.heroBody, className)}>{children}</div>
}
