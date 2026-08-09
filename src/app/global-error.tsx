'use client'

import '@/styles/tailwind.css'
import satoshiUrl from '../assets/fonts/Satoshi-Variable.woff2'

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
    <html lang="en" className="dark">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:'Satoshi';src:url('${satoshiUrl}') format('woff2');font-weight:300 900;font-display:swap;font-style:normal}`,
          }}
        />
      </head>
      <body className="m-0 grid min-h-dvh place-items-center bg-console-app font-sans text-fg">
        <div className="max-w-lg px-6 text-center">
          <h1 className="m-0 mb-2 text-[1.4rem] font-semibold text-fg">Hearst Connect is temporarily unavailable</h1>
          <p className="m-0 mb-5 text-[0.95rem] text-fg-secondary">
            An unexpected error prevented the page from rendering. Try again in a moment.
          </p>
          {error.digest ? (
            <p className="m-0 mb-5 font-sans text-xs text-fg-tertiary">Reference: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-lg border border-accent-300 bg-transparent px-[18px] py-2.5 font-sans text-[0.85rem] text-accent-300"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
