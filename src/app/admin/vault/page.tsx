import { redirect } from 'next/navigation'

/**
 * The old single-vault screen, now a redirect to the vault registry.
 *
 * ── Why the body is gone ──────────────────────────────────────────────────
 * This route was built when the service exposed one vault and the console
 * had one vault screen. The console is vault-centric now: the register lives
 * at `/admin/vaults` and each vault has its own page at
 * `/admin/vaults/[vaultId]`. Keeping this screen as well would mean two
 * surfaces answering the same question with two different compositions — the
 * duplication the operating model exists to remove — and the older of the two
 * read a narrower slice of the same endpoints.
 *
 * ── Why the file survives ─────────────────────────────────────────────────
 * `/admin/vault` is referenced from outside this page: the backend endpoint
 * registry names it as the `surface` of `vault`, `vault-strategies`,
 * `rwa-vault`, `strategy-detail` and `rebalancing-status`, and bookmarks
 * exist. Deleting the route would turn every one of those into a 404. The
 * file stays, holds no content of its own, and forwards.
 *
 * The redirect is unconditional and happens before any data is read: there is
 * nothing on this route to render, in any session state.
 */
export default function Page() {
  redirect('/admin/vaults')
}
