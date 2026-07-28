/**
 * Thème graphiques cockpit — zinc HTML Qatar + accent mint.
 */

export const chartTheme = {
  grid: 'var(--color-zinc-500)',
  gridOpacity: 0.08,
  tick: 'var(--color-zinc-500)',
  cursor: 'color-mix(in oklab, var(--color-zinc-500) 8%, transparent)',
  tooltip: {
    bg: 'var(--color-white)',
    border: 'color-mix(in oklab, var(--color-zinc-950) 10%, transparent)',
    title: 'var(--color-zinc-950)',
    body: 'var(--color-zinc-500)',
  },
  tooltipDark: {
    bg: 'var(--color-zinc-800)',
    border: 'color-mix(in oklab, var(--color-white) 10%, transparent)',
    title: 'var(--color-white)',
    body: 'var(--color-zinc-400)',
  },
  series: {
    primary: 'var(--color-accent-600)',
    primaryFill: 'var(--color-accent-500)',
    reference: 'var(--color-zinc-600)',
    success: 'var(--color-success-400)',
    tertiary: 'var(--color-zinc-500)',
    warning: 'var(--color-warning-400)',
    secondary: 'var(--color-zinc-400)',
    danger: 'var(--color-danger-400)',
    ghost: 'var(--color-zinc-600)',
  },
} as const
