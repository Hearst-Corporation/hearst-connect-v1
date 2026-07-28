import { PageHeader } from '@/components/admin/page-header'
import { AdminPage } from '@/components/admin/typography'
import { VaultDataTable } from '@/components/vaults/vault-data-table'
import { VaultValueBreakdown } from '@/components/vaults/vault-value-breakdown'
import { requireSession } from '@/lib/auth'
import { sectionContentGap } from '@/lib/layout-tokens'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Vault registry' }
export const dynamic = 'force-dynamic'

/**
 * The vault registry — the console's principal destination.
 *
 * ── Why this page is thin ─────────────────────────────────────────────────
 * It is the register, not a second dashboard. Everything an admin comes here
 * for is one row per vault, and the one reading a table cannot give at a
 * glance: how the value is distributed across the register. Two surfaces, no
 * metric strip, no chart wall. The dashboard already answers "how is the
 * estate doing"; this page answers "which vaults are there, and what is each
 * one holding".
 *
 * ── Where the data comes from, and what it costs ──────────────────────────
 * `loadAdminRegistry` reads the whole operating model in one pass and both
 * surfaces below consume the SAME `registry.vaults` reading. Rendering them
 * from two separate loads would let the table and the breakdown disagree
 * about the same vault within one paint.
 *
 * The service exposes ONE vault today (`GET /api/v1/vault`, singular — there
 * is no `/vaults` registry endpoint). That is not hidden here: the register
 * lists exactly what the service returned, and `VaultDataTable` renders a
 * named absence with the route that would answer it wherever a column has no
 * source, rather than a dash or a zero.
 *
 * The account label is passed through because the registry attributes the one
 * client-side exception this service can attest — `no_investor_record` on the
 * signed-in account — to a real name rather than to an anonymous row.
 */
export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name)

  return (
    <AdminPage>
      <PageHeader
        title="Vault registry"
        description="Every vault the service returns, with what it holds, how much of that is actually working, and what it is waiting on — one row per vault, and a named absence wherever the service publishes no reading."
      />

      {/*
        Both surfaces read the full page width: the table is ten columns wide
        and the breakdown is a list of rows, so neither has a natural narrow
        home. They are separated by the section gap rather than by a box —
        wrapping them in a container would be a frame carrying no information.
      */}
      <div className={sectionContentGap}>
        <VaultDataTable vaults={registry.vaults} />
        <VaultValueBreakdown vaults={registry.vaults} />
      </div>
    </AdminPage>
  )
}
