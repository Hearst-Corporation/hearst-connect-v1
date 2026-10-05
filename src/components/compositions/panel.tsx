import { surfaceBox } from '@/components/admin/surface'
import clsx from 'clsx'

/** Panel geometry — the material stays `surfaceBox`. */
export type PanelTone = 'wave' | 'chart' | 'metric' | 'plain'

const TONE_GEOMETRY: Record<PanelTone, string | undefined> = {
  wave: 'flex min-h-0 flex-col overflow-hidden',
  chart: 'flex min-h-0 flex-col overflow-x-hidden',
  metric: 'flex flex-col px-5 pt-4.5 pb-4',
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

export const panelHead = 'flex min-w-0 flex-none flex-wrap items-baseline gap-3 px-5 pt-4 pb-2'

export const panelTitle = 'text-lg/6 font-semibold tracking-[-0.015em] text-(--ds-text)'

export const panelHint = 'text-[0.8125rem]/5 wrap-anywhere text-(--ds-text-subtle)'

/** The title block of a panel; `hint` is optional. */
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
    <div className={panelHead}>
      <Tag className={panelTitle}>{title}</Tag>
      {hint === undefined || hint === '' ? null : <p className={panelHint}>{hint}</p>}
      {action}
    </div>
  )
}

/** The body of a panel. */
export function PanelBody({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return <div className={clsx('flex min-h-0 min-w-0 flex-col overflow-y-auto px-5 pb-4', className)}>{children}</div>
}
