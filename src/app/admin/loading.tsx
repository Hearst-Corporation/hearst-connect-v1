/**
 * Admin loading state (UI-06).
 *
 * Shown while an admin server component streams. It is a NAMED "loading" state,
 * distinct from empty / unavailable / error — it never renders placeholder
 * figures that could be mistaken for data. A single quiet line, honest about
 * what is happening.
 */
export default function AdminLoading() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: '#08080a',
        color: '#93a89c',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <p
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.8rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        Loading surface…
      </p>
    </main>
  )
}
