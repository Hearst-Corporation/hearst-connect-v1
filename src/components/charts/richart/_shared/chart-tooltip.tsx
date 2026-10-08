'use client'

import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Shared richart tooltip plumbing — one surface shell, one payload guard.
 * Charts supply only their value rows; no tooltip invents a value, it renders
 * what Recharts has in the payload.
 */

/** Extracts the hovered datum from a Recharts payload — null hides the tooltip. */
export function tooltipPoint<T>(
  active: boolean | undefined,
  payload: readonly { payload?: T }[] | undefined,
): T | null {
  const point = payload?.[0]?.payload
  return active === true && point !== undefined ? point : null
}

export function ChartTooltipShell({
  title,
  compact = false,
  children,
}: Readonly<{ title?: string; compact?: boolean; children: ReactNode }>) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-white text-xs shadow-lg ring-1 ring-console-line dark:bg-console-raised dark:ring-console-line',
        compact ? 'px-2 py-1' : 'px-3 py-2',
      )}
    >
      {title !== undefined && title !== '' ? (
        <p className="font-medium text-ink dark:text-fg">{title}</p>
      ) : null}
      {children}
    </div>
  )
}

export function TooltipRow({
  label,
  value,
  color,
  first = false,
}: Readonly<{ label?: string; value: string; color?: string; first?: boolean }>) {
  /* Le texte reste à l'encre du thème, lisible partout ; la couleur de la
     série passe dans une pastille. Un libellé vert clair en 12 px ne se lisait
     pas sur fond blanc. */
  return (
    <p
      className={clsx(
        first ? 'mt-1' : 'mt-0.5',
        'flex items-center gap-1.5 tabular-nums',
        color === undefined ? 'text-fg-tertiary dark:text-fg-secondary' : 'text-fg',
      )}
    >
      {color !== undefined ? <span className="inline-block size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden="true" /> : null}
      <span>{label === undefined ? value : `${label}: ${value}`}</span>
    </p>
  )
}
