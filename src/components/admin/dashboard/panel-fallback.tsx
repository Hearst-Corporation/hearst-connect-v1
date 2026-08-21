/**
 * Suspense fallback for streaming dashboard panels — same "loading" language
 * as `app/admin/loading.tsx`: named status, pulse, no placeholder figure.
 */
export function PanelFallback({ label = 'Loading…' }: Readonly<{ label?: string }>) {
  return (
    // h-full: fills the panel's fixed slot — the box is frozen while data loads.
    <div
      className="flex h-full min-h-24 items-center justify-center"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="animate-pulse text-sm/6 tracking-wide text-fg-secondary uppercase">
        {label}
      </p>
    </div>
  )
}
