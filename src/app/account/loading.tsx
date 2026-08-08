/**
 * Account loading state — a named "loading" status, distinct from
 * empty / unavailable / error. No placeholder figures, no fabricated content.
 */
export default function AccountLoading() {
  return (
    <main
      className="dark flex min-h-dvh items-center justify-center bg-console-app px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="animate-pulse text-sm/6 uppercase tracking-wide text-fg-tertiary">Loading…</p>
    </main>
  )
}
