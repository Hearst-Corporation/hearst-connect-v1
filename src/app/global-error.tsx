'use client'

import '@/styles/tailwind.css'
import { Button } from '@hearst/ui/catalyst/button'

/**
 * Global error boundary (UI-06).
 *
 * Catches an error thrown in the ROOT layout itself — the one case a segment
 * `error.tsx` cannot handle, because it replaces the whole document (it must
 * render its own <html>/<body>). Kept minimal so it can never fail to render.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="en" className="dark scheme-dark antialiased">
      <body className="ds-black m-0 grid min-h-dvh place-items-center">
        <div className="max-w-lg px-6 text-center">
          <h1 className="mb-2 text-2xl/7.5 text-(--ds-text)">Hearst Connect is temporarily unavailable</h1>
          <p className="mb-5 text-sm/5 text-(--ds-text-subtle)">
            An unexpected error prevented the page from rendering. Try again in a moment.
          </p>
          {error.digest ? <p className="mb-5 text-xs text-(--ds-shell-subtle)">Reference: {error.digest}</p> : null}
          <Button outline onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
}
