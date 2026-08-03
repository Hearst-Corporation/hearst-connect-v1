'use client'

/**
 * Admin error boundary (UI-06).
 *
 * Without this, a thrown error in any admin server component takes down the
 * whole route with Next's default overlay in dev and a blank 500 in prod. This
 * boundary catches it and renders a NAMED failure — never fabricated data — with
 * a way to retry. It is deliberately sober and self-contained (no backend call,
 * no import that could itself throw).
 *
 * `digest` is Next's server-side error id: it lets an operator correlate what
 * the user saw with the server log, WITHOUT exposing the error's message or
 * stack to the browser.
 */
export default function AdminError({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#08080a',
        color: '#e8efe9',
      }}
    >
      <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#93a89c',
            margin: 0,
          }}
        >
          Surface unavailable
        </p>
        <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: '10px 0 8px' }}>
          This surface could not be displayed
        </p>
        <p style={{ color: '#93a89c', fontSize: '0.95rem', margin: '0 0 20px' }}>
          An error occurred while rendering. No data is shown rather than a wrong one. Try again; if the
          problem persists, the reference below helps with diagnosis.
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
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85rem',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid #4bbf9f',
            background: 'transparent',
            color: '#4bbf9f',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
