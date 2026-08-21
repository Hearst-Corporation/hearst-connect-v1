import { HearstSecondaryAction } from '@/components/actions'
import { StatusBadge } from '@/components/admin/truthful'
import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Panel states — ONE block for every dashboard panel absence.
 * Dark-only product: `fg` family directly, no light/dark class pairs.
 * Left-aligned, `gap-2 py-5`; an optional status badge when the absence is a
 * named backend state (NOT_CONFIGURED…).
 */
export function PanelState({
  title,
  detail,
  status,
}: Readonly<{ title: string; detail?: string | null; status?: ResolvedStatus }>) {
  return (
    <div className="flex flex-col justify-center gap-2 py-5">
      {status !== undefined ? <StatusBadge status={status} /> : null}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {detail !== undefined && detail !== '' && detail !== null ? (
        <p className="text-xs text-fg-tertiary">{detail}</p>
      ) : null}
    </div>
  )
}

/** Panel footer — the single "open the full view" channel, bottom-right. */
export function PanelFooterLink({
  href,
  label,
}: Readonly<{ href: string; label: string }>) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-console-line-soft pt-3">
      <HearstSecondaryAction href={href}>{label}</HearstSecondaryAction>
    </div>
  )
}
