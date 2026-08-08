'use client'

import { surfaceBox, surfaceInset } from '@/components/admin/surface'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/**
 * Admin segment error boundary — unexpected render failures only.
 *
 * Renders inside the admin layout shell (sidebar + glow remain mounted).
 * No backend calls, no deep component tree — must never fail to paint.
 *
 * `digest` correlates with server logs without exposing message or stack.
 */
export default function AdminError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <section aria-labelledby="admin-error-title" className="mx-auto w-full max-w-3xl">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">System status</p>
      <p
        role="heading"
        aria-level={1}
        id="admin-error-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white"
      >
        Unable to load this page
      </p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
        Something went wrong while loading this section of the administration console. Try again. If
        the issue continues, use the reference below when reporting it.
      </p>

      <div className={`${surfaceBox} mt-8`}>
        <div className={`${surfaceInset} flex flex-col gap-4 p-5 sm:p-6`}>
          <ExclamationTriangleIcon
            className="size-6 shrink-0 text-warning-500 dark:text-warning-400"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-zinc-950 dark:text-white">
            We couldn&apos;t load this section.
          </p>
          <div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg border border-accent-400/40 bg-transparent px-4 py-2 text-sm font-medium text-accent-300 transition-colors hover:bg-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-console-app"
            >
              Try again
            </button>
          </div>
          {error.digest ? (
            <p className="font-mono text-xs text-zinc-500">Reference · {error.digest}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
