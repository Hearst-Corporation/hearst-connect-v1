/**
 * Suspense fallback for streaming dashboard panels — same "loading" language
 * as `app/admin/loading.tsx`: named status, pulse, no placeholder figure.
 */
export function PanelFallback({ label = 'Loading…' }: Readonly<{ label?: string }>) {
  return (
    <div
      className="flex min-h-24 items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="animate-pulse text-sm/6 tracking-wide text-fg-tertiary uppercase dark:text-fg-secondary">
        {label}
      </p>
    </div>
  )
}
