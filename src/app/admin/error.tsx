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
        background: 'var(--color-console-app, #101010)',
        color: 'var(--color-zinc-300, #dedede)',
      }}
    >
      <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--color-zinc-400, #b3b3b3)',
            margin: 0,
          }}
        >
          Surface indisponible
        </p>
        <p style={{ fontSize: '1.4rem', fontWeight: 600, margin: '10px 0 8px' }}>
          Cette surface n’a pas pu être affichée
        </p>
        <p style={{ color: 'var(--color-zinc-400, #b3b3b3)', fontSize: '0.95rem', margin: '0 0 20px' }}>
          Une erreur est survenue pendant le rendu. Aucune donnée n’est affichée plutôt qu’une donnée
          fausse. Réessayez ; si le problème persiste, la référence ci-dessous aide au diagnostic.
        </p>
        {error.digest ? (
          <p
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '0.75rem',
              color: 'var(--color-zinc-500, #8b8b8b)',
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
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85rem',
            padding: '10px 18px',
            borderRadius: '8px',
            border: '1px solid var(--color-accent-300, #a7fb90)',
            background: 'transparent',
            color: 'var(--color-accent-300, #a7fb90)',
            cursor: 'pointer',
          }}
        >
          Réessayer
        </button>
      </div>
    </main>
  )
}
