import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { Badge } from '@hearst/ui/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@hearst/ui/catalyst/description-list'
import { Callout } from '@/components/compositions'
import { formatDateTime } from '@/lib/format'
import { getSession, ROLE_LABELS } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your account' }
export const dynamic = 'force-dynamic'

/**
 * Admin account profile — session identity only.
 * Not an investor/subscription dossier.
 */

export default async function Page() {
  const session = await getSession()

  const sessionState = session === null ? 'No valid session' : 'Active session'
  const sessionExpiry =
    session === null ? '—' : formatDateTime(new Date(session.expiresAt * 1000).toISOString())

  const kpis: readonly AdminHeroKpi[] = [
    { id: 'session', title: 'Session', value: editorial(sessionState) },
    {
      id: 'role',
      title: 'Role',
      value: editorial(session === null ? '—' : ROLE_LABELS[session.role]),
    },
  ]

  return (
    <DashboardShell>
      <DashboardHeader
        title="Your account"
        kpis={kpis}
      />

      {/* Single band — the session record IS the page; the state badge lives
          on the title row. */}
      <BentoGrid>
        <BentoCard span={12}>
          <DashCard
            title="Signed in as"
            subtitle="Read from your encrypted session cookie."
            titleLevel={2}
            action={session === null ? undefined : <Badge color="zinc">{sessionState}</Badge>}
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
