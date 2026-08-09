import { surfaceBox } from '@/components/admin/surface'
import { csl } from '@/components/layout/console'
import clsx from 'clsx'

/**
 * Panel — composition canonique d'une box Hearst.
 *
 * ── Matière ───────────────────────────────────────────────────────────────
 * Toujours `surfaceBox` (`src/components/admin/surface.tsx`). Plus de
 * `csl.panel` comme second verre CSS-module. Une box = une matière.
 *
 * ── Tones ─────────────────────────────────────────────────────────────────
 * Les `tone` ne changent PAS le verre : ils ajoutent une géométrie / densité
 * (flex, overflow, padding intrinsèque KPI). Ce ne sont pas des palettes.
 *
 * | tone    | Rôle sémantique Rule 60      | Géométrie csl        |
 * |---------|------------------------------|----------------------|
 * | wave    | PANEL / CARD défaut          | wavePanel            |
 * | chart   | DATA PANEL (chart chrome)    | heroChart            |
 * | metric  | COMPACT CARD (KPI)           | metricCard           |
 * | signal  | UTILITY / signal compact     | signalCard           |
 * | plain   | matière seule, géométrie caller | —                 |
 *
 * ── Contrat ───────────────────────────────────────────────────────────────
 * - une surface, une seule bordure : pas de panneau-dans-panneau pour se cadrer ;
 * - height = content (pas d'étirement décoratif) ;
 * - l'élément HTML est choisi par l'appelant (`as`).
 */

/** Géométrie du panneau — pas une matière alternative. */
export type PanelTone = 'wave' | 'chart' | 'metric' | 'signal' | 'plain'

const TONE_GEOMETRY: Record<PanelTone, string | undefined> = {
  wave: csl.wavePanel,
  chart: csl.heroChart,
  metric: csl.metricCard,
  signal: csl.signalCard,
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
    <Tag
      {...rest}
      data-surface="box"
      className={clsx(surfaceBox, TONE_GEOMETRY[tone], className)}
    >
      {children}
    </Tag>
  )
}

/**
 * PanelHeader — le bloc titre d'un panneau.
 *
 * `hint` est facultatif : plusieurs panneaux n'ont qu'un titre.
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
    <div className={csl.heroHead}>
      <Tag className={csl.cardTitle}>{title}</Tag>
      {hint === undefined || hint === '' ? null : <p className={csl.cellText}>{hint}</p>}
      {action}
    </div>
  )
}

/** Le corps d'un panneau — l'espacement interne, déclaré une fois. */
export function PanelBody({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={clsx(csl.heroBody, className)}>{children}</div>
}
