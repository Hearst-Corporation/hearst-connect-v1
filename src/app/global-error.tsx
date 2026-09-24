'use client'

import '@/styles/tailwind.css'
import fkRegularUrl from '../assets/fonts/FKGrotesk-Regular.woff2'
import fkMediumUrl from '../assets/fonts/FKGrotesk-Medium.woff2'

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
            /* Deux graisses seulement : cette page ne porte qu'un titre et un
               paragraphe, et elle doit pouvoir s'afficher quand tout le reste
               a échoué — moins elle charge, mieux c'est. */
            __html:
              `@font-face{font-family:'FK Grotesk';src:url('${fkRegularUrl}') format('woff2');font-weight:400;font-display:swap;font-style:normal}` +
              `@font-face{font-family:'FK Grotesk';src:url('${fkMediumUrl}') format('woff2');font-weight:500;font-display:swap;font-style:normal}` +
              `:root{--font-fk-grotesk:'FK Grotesk'}`,
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
