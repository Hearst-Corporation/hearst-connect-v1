import { surfaceBox } from '@/components/admin/surface'
import { csl } from '@/components/layout/console'
import clsx from 'clsx'

/**
 * Panel — the canonical composition of a Hearst box.
 *
 * ── Material ──────────────────────────────────────────────────────────────
 * Always `surfaceBox` (`src/components/admin/surface.tsx`). No more
 * `csl.panel` as a second CSS-module glass layer. One box = one material.
 *
 * ── Tones ─────────────────────────────────────────────────────────────────
 * The `tone` values do NOT change the glass: they add geometry / density
 * (flex, overflow, intrinsic KPI padding). They are not palettes.
 *
 * | tone    | Rule 60 semantic role         | csl geometry         |
 * |---------|-------------------------------|----------------------|
 * | wave    | PANEL / CARD default          | wavePanel            |
 * | chart   | DATA PANEL (chart chrome)     | heroChart            |
 * | metric  | COMPACT CARD (KPI)            | metricCard           |
 * | signal  | UTILITY / compact signal      | signalCard           |
 * | plain   | material only, caller geometry | —                  |
 *
 * ── Contract ──────────────────────────────────────────────────────────────
 * - one surface, a single border: no panel-in-panel to frame itself ;
 * - height = content (no decorative stretching) ;
 * - the HTML element is chosen by the caller (`as`).
 */

/** Panel geometry — not an alternative material. */
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
      className={clsx(surfaceBox, 'min-w-0', TONE_GEOMETRY[tone], className)}
    >
      {children}
    </Tag>
  )
}

/**
 * PanelHeader — the title block of a panel.
 *
 * `hint` is optional: several panels have only a title.
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

/** The body of a panel — the internal spacing, declared once. */
export function PanelBody({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={clsx(csl.heroBody, className)}>{children}</div>
}
