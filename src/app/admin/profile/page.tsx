import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Callout, SectionCard } from '@/components/compositions'
import { ChartFrame } from '@/components/charts'
import { callBackend } from '@/lib/backend/client'
import { formatDateTime } from '@/lib/format'
import { motifLisible } from '@/lib/mouvements'
import { getSession, ROLE_LABELS } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import {
  FolderIcon,
  KeyIcon,
  SignalIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your account' }
export const dynamic = 'force-dynamic'

/**
 * Votre compte — blocs de composition.
 * Deux identités distinctes : session admin et dossier investisseur.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Identite = {
  readonly displayName?: string | null
  readonly email?: string | null
  readonly walletAddress?: string | null
  readonly kycStatus?: string | null
  readonly accreditation?: string | null
}

type ReponseProfil = { readonly identity?: Resolu<Identite> }

function valeurLisible(valeur: string | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  return valeur
}

export default async function Page() {
  const [session, reponse] = await Promise.all([getSession(), callBackend<ReponseProfil>('profile')])

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)
  const sessionState = session === null ? 'No valid session' : 'Active session'
  const investorState =
    identite === null || identite === undefined ? 'No investor file' : 'Investor file present'
  // `expiresAt` est en secondes epoch (session réelle) : on le rend en date
  // lisible, sans jamais le replier sur une valeur par défaut. Absent → '—'.
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
    {
      id: 'dossier',
      title: 'Investor file',
      value: editorial(investorState),
      icon: FolderIcon,
    },
    {
      id: 'source',
      title: 'Profile source',
      value: editorial(reponse.ok ? 'Reachable' : 'Unavailable'),
      icon: SignalIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Your account"
        description="Console session and investor file — two distinct identities."
        kpis={kpis}
      />

      <SectionCard title="Account activity" hint="No time series attached to this page." tone="chart">
        <ChartFrame
          question="Account activity over time"
          unite="events per day"
          etat={{
            type: 'empty',
            explication:
              'This page describes session identity and the investor file: no time series is attached to plot here.',
          }}
        />
      </SectionCard>

      <SectionCard
        title="Signed in as"
        hint="Read from your encrypted session, not from the service."
        actions={
          session === null ? undefined : (
            <Badge color="lime">{sessionState}</Badge>
          )
        }
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
      </SectionCard>

      <SectionCard
        title="Investor file"
        hint="Transmitted as-is by the service, unedited."
        actions={
          !reponse.ok ? (
            <Badge color="amber">Unreadable</Badge>
          ) : identite === null || identite === undefined ? (
            <Badge color="neutral">No file</Badge>
          ) : (
            <Badge color="lime">Present</Badge>
          )
        }
      >
        {!reponse.ok ? (
          <Callout tone="warning" title="Unreadable file">
            The investor file could not be read. The service did not respond — this silence does not mean no file exists.
          </Callout>
        ) : identite === null || identite === undefined ? (
          <>
            <Text>
              No investor file is linked to this account.
              {motif === undefined
                ? ' The service was reached: it finds no file linked to this account.'
                : ` The service was reached: ${motif}.`}
            </Text>
            <Text className="mt-4">
              This is normal for an administrator account — managing the workspace and subscribing to the fund are distinct, and one does not imply the other. No file is shown here rather than an empty file that would look lost.
            </Text>
            <Text className="mt-4 font-medium text-fg-muted dark:text-fg">For a file to appear</Text>
            <ul className="list-disc space-y-1 pl-5 text-sm/6 text-fg-tertiary">
              <li>A fund subscription completed with this email address</li>
              <li>A KYC file reviewed and approved</li>
              <li>A wallet address linked to the file</li>
            </ul>
          </>
        ) : (
          <DescriptionList>
            <DescriptionTerm>File name</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.displayName)}</DescriptionDetails>
            <DescriptionTerm>Email address</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.email)}</DescriptionDetails>
            <DescriptionTerm>Wallet</DescriptionTerm>
            <DescriptionDetails className="font-mono text-sm">
              {valeurLisible(identite.walletAddress)}
            </DescriptionDetails>
            <DescriptionTerm>KYC</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.kycStatus)}</DescriptionDetails>
            <DescriptionTerm>Accreditation</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.accreditation)}</DescriptionDetails>
          </DescriptionList>
        )}
      </SectionCard>

      <SectionCard title="Notes" hint="Definitions and paths — not counters." tone="plain">
        <DescriptionList>
          <DescriptionTerm>Investor reason</DescriptionTerm>
          <DescriptionDetails>{motif ?? 'None reported'}</DescriptionDetails>
          <DescriptionTerm>Role mapping</DescriptionTerm>
          <DescriptionDetails>Session role does not imply a subscription.</DescriptionDetails>
          <DescriptionTerm>Coverage path</DescriptionTerm>
          <DescriptionDetails>
            <Link href="/admin/runtime" className="underline">
              Data coverage
            </Link>
            {' — '}
            endpoint-level status reasons.
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
