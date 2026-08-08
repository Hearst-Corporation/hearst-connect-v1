'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/**
 * Account segment error boundary — unexpected failures only.
 * Renders inside the account shell; no backend calls, no deep tree.
 */
export default function AccountError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section
      aria-labelledby="account-error-title"
      className="w-full max-w-md rounded-xl bg-console-card p-6 ring-1 ring-console-line-soft sm:p-8"
    >
      <ExclamationTriangleIcon
        className="size-6 shrink-0 text-warning-400"
        aria-hidden="true"
      />
      <p
        role="heading"
        aria-level={1}
        id="account-error-title"
        className="mt-4 text-xl font-semibold tracking-tight text-fg"
      >
        Unable to load this page
      </p>
      <p className="mt-2 text-sm leading-6 text-fg-tertiary">
        Something went wrong while loading your space. Try again. If the issue continues, use the
        reference below when reporting it.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg border border-accent-400/40 bg-transparent px-4 py-2 text-sm font-medium text-accent-300 transition-colors hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-console-app"
        >
          Try again
        </button>
      </div>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-fg-tertiary">Reference · {error.digest}</p>
      ) : null}
    </section>
  )
}
