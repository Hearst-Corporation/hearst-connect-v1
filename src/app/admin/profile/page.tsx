import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, type Role } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Your Account' }
export const dynamic = 'force-dynamic'

/**
 * Your account — what the product knows about the signed-in person.
 *
 * Two identities coexist here and must not be confused: the admin account,
 * which opens this console, and the investor record, which links a person
 * to a position in the fund. The former always exists — you're signed in.
 * The latter only exists for someone who has subscribed.
 *
 * The service answers here with "partial, no value": that's the correct
 * answer for an admin account, not an outage. The page says so in those
 * words rather than showing an empty identity card, which would read like
 * a lost record.
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

const LIBELLE_ROLE: Record<Role, string> = {
  OWNER: 'Space owner',
  ADMIN: 'Administrator',
  MEMBER: 'Member',
}

function DossierInvestisseur({
  ok,
  identite,
  motif,
}: Readonly<{ ok: boolean; identite: Identite | null | undefined; motif: string | undefined }>) {
  if (!ok) {
    return (
      <SourceAttendue
        quoi="The investor record could not be read"
        detail="The service did not respond to the request. This silence doesn't mean no record exists."
        requis={['A response from the service']}
      />
    )
  }

  if (identite === null || identite === undefined) {
    const suffixe =
      motif === undefined
        ? 'The service was reached: it finds no record attached to this account.'
        : `The service was reached: ${motif}.`
    return (
      <SourceAttendue
        quoi="No investor record is attached to this account"
        detail={`${suffixe} This is the normal case for an admin account — administering the space and subscribing to the fund are two distinct things, and one doesn't imply the other. No record is shown here rather than an empty one, which would look like a lost record.`}
        requis={[
          'A fund subscription made with this email address',
          'A know-your-customer file reviewed and approved',
          'A wallet address attached to the record',
        ]}
      />
    )
  }

  return (
    <Card>
      <CardHeader title="What the service knows about you" hint="Passed through from the service, unedited" />
      <dl className="divide-y divide-zinc-950/5 dark:divide-white/5">
        <Ligne libelle="Record name" valeur={identite.displayName} />
        <Ligne libelle="Email address" valeur={identite.email} />
        <Ligne libelle="Wallet" valeur={identite.walletAddress} mono />
        <Ligne libelle="Know-your-customer" valeur={identite.kycStatus} />
        <Ligne libelle="Qualification" valeur={identite.accreditation} />
      </dl>
    </Card>
  )
}

export default async function Page() {
  const [session, reponse] = await Promise.all([getSession(), callBackend<ReponseProfil>('profile')])

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Your Account"
        description="The account that opens this console, and the investor record attached to it — if one exists."
      />

      <AdminSection>

      {/* ── A. The signed-in account: the one certainty on this page ────── */}
      <Card>
        <CardHeader title="Signed in as" hint="Read from your session, not from the service" />
        {session === null ? (
          <p className="px-5 py-6 text-sm text-danger-400">
            No valid session was found. Sign in again to view your account.
          </p>
        ) : (
          <dl className="divide-y divide-zinc-950/5 dark:divide-white/5">
            <Ligne libelle="Name" valeur={session.name} />
            <Ligne libelle="Email address" valeur={session.email} />
            <Ligne libelle="Role" valeur={LIBELLE_ROLE[session.role]} />
          </dl>
        )}
      </Card>

      {/* ── B. The investor record: present, or honestly absent ─── */}
      <section aria-labelledby="dossier" className="space-y-3">
        <h2 id="dossier" className="text-sm font-semibold text-zinc-950 dark:text-white">
          Investor record
        </h2>

        <DossierInvestisseur ok={reponse.ok} identite={identite} motif={motif} />
      </section>

      {/* The basement: the detailed response for anyone who wants to verify a field. */}
      </AdminSection>
    </div>
  )
}

/** A missing value renders as "—": never an empty string, never a zero. */
function Ligne({
  libelle,
  valeur,
  mono = false,
}: Readonly<{ libelle: string; valeur: string | null | undefined; mono?: boolean }>) {
  const affiche = valeur === null || valeur === undefined || valeur === '' ? '—' : valeur
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
      <dt className="w-40 shrink-0 text-sm text-zinc-500 dark:text-zinc-400">{libelle}</dt>
      <dd
        className={
          mono
            ? 'min-w-0 truncate font-mono text-sm text-zinc-700 dark:text-zinc-200'
            : 'min-w-0 text-sm text-zinc-950 dark:text-white'
        }
      >
        {affiche}
      </dd>
    </div>
  )
}
