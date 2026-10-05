import { HearstSecondaryAction } from '@/components/actions'
import { StatusBadge } from '@/components/admin/truthful'
import { Link } from '@hearst/ui/catalyst/link'
import type { ResolvedStatus } from '@/lib/resolved'

/**
 * Panel states — ONE block for every dashboard panel absence.
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
      <p className="text-sm font-semibold text-(--ds-text)">{title}</p>
      {detail !== undefined && detail !== '' && detail !== null ? (
        <p className="text-xs text-(--ds-shell-subtle)">{detail}</p>
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
    <div className="flex flex-wrap items-center justify-end gap-3 border-t border-(--ds-divider) pt-3">
      <HearstSecondaryAction href={href}>{label}</HearstSecondaryAction>
    </div>
  )
}

/**
 * Quiet "full view" link for the card TITLE row (DashCard `action`) — the
 * cockpit does not spend a bordered footer strip on one link.
 */
export function PanelHeaderLink({
  href,
  children,
}: Readonly<{ href: string; children: React.ReactNode }>) {
  return (
    <Link
      href={href}
      className="shrink-0 text-xs font-medium text-(--ds-accent) underline decoration-(--ds-accent)/40 underline-offset-4 hover:text-(--ds-accent-hover)"
    >
      {children}
    </Link>
  )
}
