'use client'

import { Button } from '@hearst/ui/catalyst/button'
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
      className="w-full max-w-md rounded-xl bg-(--ds-surface-raised) p-6 ring-1 ring-(--ds-divider) sm:p-8"
    >
      <ExclamationTriangleIcon
        className="size-6 shrink-0 text-(--ds-warning)"
        aria-hidden="true"
      />
      <h1
        id="account-error-title"
        className="mt-4 text-xl font-semibold tracking-tight text-(--ds-text)"
      >
        Unable to load this page
      </h1>
      <p className="mt-2 text-sm leading-6 text-(--ds-shell-subtle)">
        Something went wrong while loading your space. Try again. If the issue continues, use the
        reference below when reporting it.
      </p>
      <div className="mt-6">
        <Button outline onClick={reset}>
          Try again
        </Button>
      </div>
      {error.digest ? (
        <p className="mt-4 font-mono text-xs text-(--ds-shell-subtle)">Reference · {error.digest}</p>
      ) : null}
    </section>
  )
}
