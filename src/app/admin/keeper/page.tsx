import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { StatusBadge } from '@/components/admin/truthful'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Keeper Actions' }
export const dynamic = 'force-dynamic'


function Card({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

/**
 * Keeper Actions — the routes that ask the service to record something.
 *
 * Composition, and why it is this one:
 *
 * 1. The scope statement (8 columns) and the readiness panel (4) sit on one
 *    row because together they answer a single question: what can these
 *    routes do at all, and can *you* run them right now. Split across two
 *    stacked full-width bands they read as two unrelated announcements.
 *
 * 2. The scope statement no longer wears an amber wash. Orange means
 *    "something is wrong" in this console; "these routes sign nothing" is a
 *    permanent property of the API, not an incident. The `NOT_SUPPORTED`
 *    badge carries that fact, and amber stays available for the one line
 *    that genuinely reports a degraded state — the reason actions are inert.
 *
 * 3. The action forms occupy a declared two-up grid. A form with two number
 *    fields does not need 1280px, and six of them stacked full width read as
 *    six unrelated pages rather than one list of six routes.
 */

/**
 * One prerequisite, stated rather than implied.
 *
 * A disabled action must always say why it is disabled: the operator sees
 * the condition, the value the console actually observed, and whether it is
 * met — not just a greyed-out button.
 */
function Prerequisite({
  libelle,
  valeur,
  satisfait,
}: Readonly<{ libelle: string; valeur: string; satisfait: boolean }>) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{libelle}</dt>
      <dd
        className={clsx(
          'text-sm font-medium',
          satisfait ? 'text-zinc-950 dark:text-white' : 'text-warning-400',
        )}
      >
        {valeur}
      </dd>
    </div>
  )
}

export default async function KeeperPage() {
  const session = await requireSession()
  const user = publicUser(session)
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

  // An even count pairs up cleanly; anything else stays full width rather
  // than stranding one lone card on the left of an empty row.
  const actionSpan = keeperEndpoints.length % 2 === 0 ? (6 as const) : (12 as const)
  const actionMd = actionSpan === 12 ? (8 as const) : (4 as const)

  return (
    <GreenCommandCenterShell
      label="Hearst Connect keeper cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Keeper summary">
        <Panel className={gcc.metricCard}><h2>Actions</h2><div className={gcc.metricText}><Reading value={editorial(String(keeperEndpoints.length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Role</h2><div className={gcc.metricText}><Reading value={editorial(session.role)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Backend URL</h2><div className={gcc.metricText}><Reading value={editorial(backendConfigured ? 'Configured' : 'Not set')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Authorization</h2><div className={gcc.metricText}><Reading value={editorial(isAdmin ? 'Admin access' : 'Restricted')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Keeper enabled</h2><div className={gcc.metricText}><Reading value={editorial('Backend circuit breaker applies')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Keeper <span>actions</span></p>
          <p className={gcc.decisionMeta}>{disabledReason ? 'Actions inert' : 'Actions available'}</p>
          <p className={gcc.decisionActionMuted}>Explicit CONFIRM required</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Keeper scope and readiness">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Keeper actions</h2></div>
          <div className={gcc.heroBody}>
      <AdminSection title="Scope" description="These routes log a request — they sign nothing">
        <AdminGrid>
          <AdminCol span={8}>
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusBadge status="NOT_SUPPORTED" />
                <AdminSurfaceTitle as="p">None of these routes signs a transaction</AdminSurfaceTitle>
              </div>
              <p className="mt-3 max-w-prose text-sm/6 text-zinc-600 dark:text-zinc-300">
                The backend has no on-chain write helper: these routes log a request, they produce neither a
                signature nor a transaction hash. Three of them currently return an HTTP 501 with a{' '}
                <span className="font-mono">KeeperActionResult</span>. This console will never display a
                fabricated hash.
              </p>
              <p className="mt-2 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
                Two additional safeguards on the backend side: a quota of 5 requests per minute per user, and the{' '}
                <span className="font-mono">KEEPER_ENABLED</span> circuit breaker — disabled by default, it
                returns 503 <span className="font-mono">NOT_CONFIGURED</span>.
              </p>
            </Card>
          </AdminCol>

          <AdminCol span={4} as="aside">
            <Card className="p-5">
              <AdminSurfaceTitle as="p">Can these run right now?</AdminSurfaceTitle>
              <dl className="mt-4 space-y-3">
                <Prerequisite
                  libelle="Your role"
                  valeur={session.role}
                  satisfait={isAdmin}
                />
                <Prerequisite
                  libelle="Service address"
                  valeur={backendConfigured ? 'Configured' : 'Not set'}
                  satisfait={backendConfigured}
                />
              </dl>
              {disabledReason ? (
                <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs leading-relaxed text-warning-400 dark:border-console-line">
                  Actions inert: {disabledReason}
                </p>
              ) : (
                <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs leading-relaxed text-zinc-500 dark:border-console-line dark:text-zinc-400">
                  Both prerequisites are met. The service may still refuse a call — its circuit breaker and its
                  quota are checked on its side, and its answer is shown under the action that triggered it.
                </p>
              )}
            </Card>
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Role gate</h3><p className={gcc.cellText}>{isAdmin ? 'Satisfied' : 'Not satisfied'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Service address</h3><p className={gcc.cellText}>{backendConfigured ? 'Configured' : 'Missing'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Disabled reason</h3><p className={gcc.cellText}>{disabledReason ?? 'None'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Keeper forms">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Actions</h3></div>
          <div className={gcc.heroBody}>
      <AdminSection
        title="Actions"
        description={`${keeperEndpoints.length} routes exposed by the service. Nothing leaves this page until the word CONFIRM has been typed into the action's own field.`}
      >
        <AdminGrid>
          {keeperEndpoints.map((endpoint) => (
            <AdminCol key={endpoint.id} span={actionSpan} md={actionMd}>
              <KeeperForm
                endpoint={endpoint}
                disabled={Boolean(disabledReason)}
                disabledReason={disabledReason}
              />
            </AdminCol>
          ))}
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Confirmation</h3><p className={gcc.cellText}>Each form requires typing `CONFIRM`.</p></article>
          <article className={gcc.infoCell}><h3>No signature</h3><p className={gcc.cellText}>Requests do not generate on-chain signatures.</p></article>
          <article className={gcc.infoCell}><h3>Quota</h3><p className={gcc.cellText}>Backend enforces request rate limits.</p></article>
          <article className={gcc.infoCell}><h3>Result</h3><p className={gcc.cellText}>Backend response is rendered as-is.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Operational note</h3>
          <p className={gcc.cellText}>Use Keeper for intentional backend write requests only.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
