import { gcc } from './primitives'

/**
 * The full-screen shell.
 *
 * The reference is explicit that this is not a mock-up: no outer frame, no
 * page margin, no global radius, no top header, the rail flush to the left
 * edge, content out to the viewport bounds. This component is the only place
 * that geometry is asserted, and it mounts NO AdminShell — the laboratory
 * lives outside `/admin` precisely so the console's sidebar is not stacked
 * underneath a second one.
 */
export function GreenCommandCenterShell({
  rail,
  children,
  label,
}: Readonly<{ rail: React.ReactNode; children: React.ReactNode; label: string }>) {
  return (
    <main className={gcc.viewport} aria-label={label}>
      <section className={gcc.shell} data-gcc="shell">
        {rail}
        <div className={gcc.workspace} data-gcc="workspace">
          {children}
        </div>
      </section>
    </main>
  )
}

export { gcc }
