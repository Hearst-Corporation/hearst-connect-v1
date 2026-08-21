import { DashCard, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Callout } from '@/components/compositions'
import { formatDateTime } from '@/lib/format'
import { getSession, ROLE_LABELS } from '@/lib/session'
import { editorial, isAvailable } from '@/lib/vaults/model'
import { KeyIcon, UserIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your account' }
export const dynamic = 'force-dynamic'

/**
 * Admin account profile — session identity only.
 * Not an investor/subscription dossier.
 */

/**
 * Compact command bar — one title line, KPIs as a compact strip beside it.
 */
function ProfileHeader({ kpis }: Readonly<{ kpis: readonly AdminHeroKpi[] }>) {
  return (
    <header
      data-admin="hero-header"
      className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
    >
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight text-fg">Your account</h1>
        <p className="mt-0.5 text-xs text-fg-tertiary">
          Signed-in administrator identity and session.
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

export default async function Page() {
  const session = await getSession()

  const sessionState = session === null ? 'No valid session' : 'Active session'
  const sessionExpiry =
    session === null ? '—' : formatDateTime(new Date(session.expiresAt * 1000).toISOString())

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'session', title: 'Session', value: editorial(sessionState), icon: KeyIcon },
    {
      id: 'role',
      title: 'Role',
      value: editorial(session === null ? '—' : ROLE_LABELS[session.role]),
      icon: UserIcon,
    },
  ]

  return (
    <DashboardShell>
      <ProfileHeader kpis={kpis} />

      {/* Single band — the session record IS the page; the state badge lives
          on the title row. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            title="Signed in as"
            subtitle="Read from your encrypted session cookie."
            titleLevel={2}
            action={session === null ? undefined : <Badge color="neutral">{sessionState}</Badge>}
          >
            {session === null ? (
              <Callout tone="warning" title="No valid session">
                No valid session was found. Sign in again to view your account.
              </Callout>
            ) : (
              <DescriptionList>
                <DescriptionTerm>Name</DescriptionTerm>
                <DescriptionDetails>{session.name}</DescriptionDetails>
                <DescriptionTerm>Email address</DescriptionTerm>
                <DescriptionDetails>{session.email}</DescriptionDetails>
                <DescriptionTerm>Role</DescriptionTerm>
                <DescriptionDetails>{ROLE_LABELS[session.role]}</DescriptionDetails>
                <DescriptionTerm>Identifier</DescriptionTerm>
                <DescriptionDetails className="font-mono text-sm">{session.userId}</DescriptionDetails>
                <DescriptionTerm>Session end</DescriptionTerm>
                <DescriptionDetails>{sessionExpiry}</DescriptionDetails>
              </DescriptionList>
            )}
          </DashCard>
        </BentoCard>
      </BentoGrid>
    </DashboardShell>
  )
}
