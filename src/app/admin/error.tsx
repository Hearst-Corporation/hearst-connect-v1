'use client'

import { Button } from '@hearst/ui/catalyst/button'
import { surfaceBox, surfaceInset } from '@/components/admin/surface'
import { AdminHeroTitle } from '@/components/admin/typography'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

/**
 * Admin segment error boundary — unexpected render failures only.
 *
 * Renders inside the admin layout shell (the sidebar stays mounted).
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
      <AdminHeroTitle id="admin-error-title">Unable to load this page</AdminHeroTitle>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-(--ds-shell-subtle)">
        Something went wrong while loading this section of the administration console. Try again. If
        the issue continues, use the reference below when reporting it.
      </p>

      <div className={`${surfaceBox} mt-8`}>
        <div className={`${surfaceInset} flex flex-col gap-4 p-5 sm:p-6`}>
          <ExclamationTriangleIcon
            className="size-6 shrink-0 text-(--ds-warning)"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-(--ds-text)">
            We couldn&apos;t load this section.
          </p>
          <div>
            <Button outline onClick={reset}>
              Try again
            </Button>
          </div>
          {error.digest ? (
            <p className="font-mono text-xs text-(--ds-shell-subtle)">Reference · {error.digest}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
