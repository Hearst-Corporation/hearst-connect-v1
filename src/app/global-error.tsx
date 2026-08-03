'use client'

/**
 * Global error boundary (UI-06).
 *
 * Catches an error thrown in the ROOT layout itself — the one case a segment
 * `error.tsx` cannot handle, because it replaces the whole document (it must
 * render its own <html>/<body>). Kept minimal and dependency-free so it can
 * never fail to render.
 */
export default function GlobalError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#08080a',
          color: '#e8efe9',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center', padding: '24px' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 8px' }}>
            Hearst Connect est momentanément indisponible
          </h1>
          <p style={{ color: '#93a89c', fontSize: '0.95rem', margin: '0 0 20px' }}>
            Une erreur inattendue a empêché l’affichage. Réessayez dans un instant.
          </p>
          {error.digest ? (
            <p
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.75rem',
                color: '#5a6b62',
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
              border: '1px solid #4bbf9f',
              background: 'transparent',
              color: '#4bbf9f',
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
