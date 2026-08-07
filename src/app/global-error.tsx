'use client'

import satoshiUrl from '../assets/fonts/Satoshi-Variable.woff2'

/**
 * Global error boundary (UI-06).
 *
 * Catches an error thrown in the ROOT layout itself — the one case a segment
 * `error.tsx` cannot handle, because it replaces the whole document (it must
 * render its own <html>/<body>). Kept minimal so it can never fail to render.
 * Police : Satoshi Variable. Texte : blanc deep.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="fr" className="dark">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:'Satoshi';src:url('${satoshiUrl}') format('woff2');font-weight:300 900;font-display:swap;font-style:normal}`,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--color-console-app, #101010)',
          color: 'var(--color-white, #ffffff)',
          fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center', padding: '24px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 8px', color: 'var(--color-white, #ffffff)' }}>
            Hearst Connect est momentanément indisponible
          </h1>
          <p style={{ color: 'var(--color-zinc-400, #f2f2f2)', fontSize: '0.95rem', margin: '0 0 20px' }}>
            Une erreur inattendue a empêché l’affichage. Réessayez dans un instant.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
                fontSize: '0.75rem',
                color: 'var(--color-zinc-500, #e0e0e0)',
                margin: '0 0 20px',
              }}
            >
              Référence : {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              fontSize: '0.85rem',
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid var(--color-accent-300, #a7fb90)',
              background: 'transparent',
              color: 'var(--color-accent-300, #a7fb90)',
              cursor: 'pointer',
              fontFamily: "'Satoshi', ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
