/**
 * Surface grammar — the approved neutral-graphite system.
 *
 * A card is CHARCOAL ON GRAPHITE: `--bg-card` (#2a2a2a) sitting on the shell's
 * `--bg-shell` (#232323), one hairline border, one restrained shadow. It is
 * lighter than what it sits on, which is what makes the console legible — the
 * previous build cut cards out of the background as darker holes, and every
 * panel read as a recess.
 *
 * An inset is the opposite move, and the only one: `--bg-inset` (#202020) for
 * a block that genuinely sinks into a card. Nothing in this file introduces a
 * hue; the accent is applied deliberately, never as a surface tint.
 */

export const surfaceRaised =
  'rounded-xl bg-white shadow-lg ring-1 ring-zinc-950/10 dark:bg-console-card dark:shadow-[0_10px_28px_rgba(0,0,0,0.24)] dark:ring-console-line'

/*
 * Retirés le 2026-08-04 (LOT B) : `surfaceSunken`, `Panel` et `PanelHeading`.
 * Aucun appelant — les cinq modules qui importent ce fichier ne prennent que
 * `surfaceRaised` ou `RequirementList`. Attention en lisant l'historique : un
 * `Panel` homonyme et bien vivant existe dans
 * `components/layout/console.tsx` (une trentaine
 * d'importeurs) ; ce n'est pas celui-ci.
 */

/**
 * List of items a source still needs to provide.
 *
 * Two surfaces render it with different layouts (`SourceAttendue`, centered,
 * in `cockpit.tsx`; `AdminSourceAttendue`, left-aligned, in `surfaces.tsx`).
 * Only the list itself was identical: it lives here, both wrappers stay with
 * their respective owners.
 */
export function RequirementList({ requis }: Readonly<{ requis: readonly string[] }>) {
  return (
    <ul className="mt-2 space-y-1">
      {requis.map((r) => (
        <li key={r} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span aria-hidden="true" className="text-zinc-400">
            ·
          </span>
          {r}
        </li>
      ))}
    </ul>
  )
}
