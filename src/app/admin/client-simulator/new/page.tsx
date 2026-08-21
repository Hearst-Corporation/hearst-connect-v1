import { DashCard, DashboardShell, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { ChartFrame } from '@/components/charts'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { ROLE_LABELS } from '@/lib/session'
import { editorial, isAvailable } from '@/lib/vaults/model'
import {
  PaperAirplaneIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { CreateClientForm } from './create-client-form'

export const metadata: Metadata = { title: 'New simulated client' }
export const dynamic = 'force-dynamic'

const CHAMPS_REQUIS = [
  'Email — the account’s login identifier',
  'Password — min. 8 characters, never returned by the service',
  'Role — investor (simulated client) or admin',
  'CONFIRM — explicit safeguard before any submission',
] as const

const NON_RESTITUE = [
  'Password: the backend never returns it, no copy on the front end',
  'No demo data: a 201 is a real creation in the database',
  'Directory indexing may take a moment after creation',
] as const

/**
 * Compact command bar — one title line, the directory link on the same row,
 * KPIs as a compact strip beside it.
 */
function NewClientHeader({ kpis }: Readonly<{ kpis: readonly AdminHeroKpi[] }>) {
  return (
    <header
      data-admin="hero-header"
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-fg">New simulated client</h1>
          <PanelHeaderLink href="/admin/clients">Back to client directory</PanelHeaderLink>
        </div>
        <p className="mt-0.5 text-xs text-fg-tertiary">
          Real creation via POST /api/v1/admin/users — password never returned.
        </p>
      </div>

      <dl className="flex min-w-0 flex-1 flex-wrap items-end justify-end gap-x-8 gap-y-3">
        {kpis.map((kpi) => {
          const available = isAvailable(kpi.value)
          return (
            <div key={kpi.id} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-fg-secondary">
                <kpi.icon className="size-3.5 shrink-0 text-accent-300" aria-hidden="true" />
                <span className="truncate">{kpi.title}</span>
              </dt>
              <dd className="mt-0.5 flex items-baseline gap-1.5">
                <span
                  className={`text-2xl/7 font-semibold tracking-tight tabular-nums ${available ? 'text-fg' : 'text-fg-tertiary'}`}
                >
                  {available ? kpi.value.value : '—'}
                </span>
                {kpi.unit !== undefined && kpi.unit !== '' ? (
                  <span className="truncate text-[11px] text-fg-tertiary">{kpi.unit}</span>
                ) : null}
              </dd>
            </div>
          )
        })}
      </dl>
    </header>
  )
}

/**
 * New simulated client — POST /api/v1/admin/users (admin only).
 * Creates a real account in the database; the password is never returned by the service.
 *
 * Cockpit shape: the form is the dominant card; the two contract notes and
 * the (named-empty) chart stack in the flank so the row ends on one line.
 */
export default async function Page() {
  const session = await requireSession()

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Role “${ROLE_LABELS[session.role]}” does not grant access to account creation.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL is not set — no request can be sent.'
  }

  const canPost = disabledReason === null

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'role',
      title: 'Your role',
      value: editorial(ROLE_LABELS[session.role]),
      icon: UserIcon,
    },
    {
      id: 'backend',
      title: 'Backend',
      value: editorial(backendConfigured ? 'Configured' : 'Not configured'),
      icon: ServerIcon,
    },
    {
      id: 'envoi',
      title: 'Can submit',
      value: editorial(canPost ? 'Ready' : 'Blocked'),
      icon: PaperAirplaneIcon,
    },
  ]

  return (
    <DashboardShell>
      <NewClientHeader kpis={kpis} />

      {/* Single row — the form dominates; notes + chart flank it. */}
      <BentoGrid>
        <BentoCard span={8}>
          <DashCard
            title="Create an investor or admin account"
            subtitle="The service never returns the password — only id, email, and role are shown after success."
            titleLevel={2}
          >
            <CreateClientForm disabled={!canPost} disabledReason={disabledReason} />
          </DashCard>
        </BentoCard>
        <BentoCard span={4}>
          <div className="flex min-w-0 flex-col gap-6">
            <DashCard title="Request fields" subtitle="What POST /api/v1/admin/users expects." titleLevel={2}>
              <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
                {CHAMPS_REQUIS.map((champ) => (
                  <li key={champ}>{champ}</li>
                ))}
              </ul>
            </DashCard>
            <DashCard title="What is not returned" subtitle="Simulator veracity rule." titleLevel={2}>
              <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
                {NON_RESTITUE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </DashCard>
            <ChartFrame
              question="Account creations per day"
              unit="accounts / day"
              viewport="compact"
              state={{
                type: 'empty',
                explanation:
                  'No series to plot — this screen emits one creation at a time and does not measure history. The real account count lives in the client directory.',
              }}
            />
          </div>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
