import clsx from 'clsx'
import type { ReactNode } from 'react'

/**
 * Compact definition rows for the Service cockpit cards — the cockpit
 * density version of the Catalyst `DescriptionList`: one hairline-divided
 * `dl`, dark-only tokens (`fg` family, `console-line-soft`), no light/dark
 * class pairs.
 */
export function FieldList({ children }: Readonly<{ children: ReactNode }>) {
  return <dl className="flex flex-col divide-y divide-console-line-soft">{children}</dl>
}

export function FieldRow({
  term,
  mono = false,
  stacked = false,
  children,
}: Readonly<{
  term: string
  /** Monospace value (commit sha, contract address) — one notch smaller. */
  mono?: boolean
  /** Term above the value instead of side-by-side (long explanations). */
  stacked?: boolean
  children: ReactNode
}>) {
  if (stacked) {
    return (
      <div className="py-2 first:pt-0 last:pb-0">
        <dt className="text-sm font-medium text-fg">{term}</dt>
        <dd className="mt-0.5 text-xs text-fg-tertiary">{children}</dd>
      </div>
    )
  }
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 first:pt-0 last:pb-0">
      <dt className="shrink-0 text-sm text-fg-tertiary">{term}</dt>
      <dd
        className={clsx(
          'min-w-0 truncate text-right text-fg',
          mono ? 'font-mono text-xs' : 'text-sm',
        )}
        title={typeof children === 'string' ? children : undefined}
      >
        {children}
      </dd>
    </div>
  )
}
