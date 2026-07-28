import { AdminSection } from '@/components/admin/surfaces'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/truthful'
import { AdminPage } from '@/components/admin/typography'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import type { Metadata } from 'next'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Keeper Actions' }
export const dynamic = 'force-dynamic'

export default async function KeeperPage() {
  const session = await requireSession()
  const keeperEndpoints = endpointsByCategory('keeper')

  // Prerequisites known BEFORE any call: without them the actions stay inert.
  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())
  // The bearer token comes from the backend and lives in the session cookie.
  // `requireSession` has already discarded any expired session: by the time we
  // get here, the token is valid — we don't re-check the clock during render.

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `The ${session.role} role does not grant access to Keeper actions.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL is not set: no request can be issued.'
  }

  return (
    <AdminPage>
      <PageHeader
        title="Keeper Actions"
        description="Backend administration actions. Nothing is sent without explicit confirmation, no success is assumed, and the backend response is rendered as-is."
      />

      <AdminSection title="Scope" description="These routes log a request — they sign nothing">
        <div className="rounded-xl bg-amber-500/5 p-5 ring-1 ring-amber-500/30 sm:p-6 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <StatusBadge status="NOT_SUPPORTED" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              None of these routes sign a transaction
            </h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            The backend has no on-chain write helper: these routes log a request, they produce neither a signature
            nor a transaction hash. Three of them currently return an HTTP 501 with a{' '}
            <span className="font-mono">KeeperActionResult</span>. This console will never display a fabricated hash.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Two additional safeguards on the backend side: a quota of 5 requests per minute per user, and the{' '}
            <span className="font-mono">KEEPER_ENABLED</span> circuit breaker — disabled by default, it returns 503{' '}
            <span className="font-mono">NOT_CONFIGURED</span>.
          </p>
        </div>
        {disabledReason ? (
          <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:text-zinc-300 dark:ring-white/5">
            Actions inert: {disabledReason}
          </p>
        ) : null}
      </AdminSection>

      <AdminSection title="Actions" description="Explicit confirmation required before any call">
        {keeperEndpoints.map((endpoint) => (
          <KeeperForm
            key={endpoint.id}
            endpoint={endpoint}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
          />
        ))}
      </AdminSection>
    </AdminPage>
  )
}
