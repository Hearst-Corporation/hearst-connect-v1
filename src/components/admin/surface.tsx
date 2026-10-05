/** Box: a panel in the page's black, edged by a hairline. */
export const surfaceBox = 'rounded-(--ds-radius-lg) bg-(--ds-surface) ring-1 ring-(--ds-divider)'

/** A well inside a box (code, forms, metadata). */
export const surfaceInset = 'rounded-(--ds-radius-sm) bg-(--ds-surface-raised) ring-1 ring-(--ds-divider)'

/** The selected item of a list. */
export const surfaceSelect = 'data-selected:bg-(--ds-accent)/10 data-selected:ring-1 data-selected:ring-(--ds-accent)/25'

/**
 * List of items a source still needs to provide.
 */
export function RequirementList({ requis }: Readonly<{ requis: readonly string[] }>) {
  return (
    <ul className="mt-2 space-y-1">
      {requis.map((r) => (
        <li key={r} className="flex gap-2 text-sm text-(--ds-text)">
          <span aria-hidden="true" className="text-(--ds-text-subtle)">
            ·
          </span>
          {r}
        </li>
      ))}
    </ul>
  )
}
