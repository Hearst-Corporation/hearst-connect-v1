import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, type Role } from '@/lib/session'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: 'Your Account' }
export const dynamic = 'force-dynamic'

const manual = (value: string) => ({ kind: 'available' as const, value, provenance: 'manual' as const, asOf: null, stale: false })

function Card({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

function CardHeader({ title, hint }: Readonly<{ title: string; hint: string }>) {
  return (
    <div className={gcc.heroHead}>
      <h3 className={gcc.cardTitle}>{title}</h3>
      <p className={gcc.cellText}>{hint}</p>
    </div>
  )
}

function SourceAttendue({
  quoi,
  detail,
  requis,
}: Readonly<{ quoi: string; detail: string; requis: readonly string[] }>) {
  return (
    <Panel className={gcc.wavePanel}>
      <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>{quoi}</h3></div>
      <div className={gcc.heroBody}>
        <p className={gcc.cellText}>{detail}</p>
        {requis.map((item) => <p key={item} className={gcc.cellText}>{item}</p>)}
      </div>
    </Panel>
  )
}

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
 *
 * Composition: the two identities sit side by side on one row — 5 columns
 * for the certainty, 7 for the question mark — because seeing them apart is
 * the point of the page. Stacked full width they read as one long profile,
 * which is exactly the confusion this screen exists to prevent. Neither
 * block is a card inside a card: the section supplies the rule and the
 * heading, each column supplies exactly one surface.
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
      <CardHeader title="Investor record" hint="Passed through from the service, unedited" />
      <dl className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
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
  const railUserName = session?.name ?? 'Hearst user'
  const railUserRole = session?.role ?? 'MEMBER'

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)
  const sessionState = session === null ? 'No valid session' : 'Session active'
  const investorState = identite === null || identite === undefined ? 'No investor record' : 'Investor record present'

  return (
    <GreenCommandCenterShell
      label="Hearst Connect profile cockpit"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={railUserName} userRole={railUserRole} />}
    >
      <section className={gcc.metricsRow} aria-label="Profile summary">
        <Panel className={gcc.metricCard}><h2>Session</h2><div className={gcc.metricText}><Reading value={manual(sessionState)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Name</h2><div className={gcc.metricText}><Reading value={manual(session?.name ?? '—')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Email</h2><div className={gcc.metricText}><Reading value={manual(session?.email ?? '—')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Role</h2><div className={gcc.metricText}><Reading value={manual(session === null ? '—' : LIBELLE_ROLE[session.role])} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Investor record</h2><div className={gcc.metricText}><Reading value={manual(investorState)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Account <span>identity</span></p>
          <p className={gcc.decisionMeta}>{reponse.ok ? 'Profile endpoint reachable' : 'Profile endpoint unavailable'}</p>
          <p className={gcc.decisionActionMuted}>Session and investor are distinct</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Profile identity">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Your account</h2></div>
          <div className={gcc.heroBody}>
      <AdminSection
        title="Identity"
        description="Two things live here and they are not the same. The account is what signs you in; the investor record is what links a person to a position in the fund. One does not imply the other."
      >
        <AdminGrid>
          {/* ── A. The signed-in account: the one certainty on this page ──── */}
          <AdminCol span={5}>
            <Card>
              <CardHeader title="Signed in as" hint="Read from your session, not from the service" />
              {session === null ? (
                <p className="px-5 py-6 text-sm text-danger-400 sm:px-6">
                  No valid session was found. Sign in again to view your account.
                </p>
              ) : (
                <dl className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                  <Ligne libelle="Name" valeur={session.name} />
                  <Ligne libelle="Email address" valeur={session.email} />
                  <Ligne libelle="Role" valeur={LIBELLE_ROLE[session.role]} />
                </dl>
              )}
            </Card>
          </AdminCol>

          {/* ── B. The investor record: present, or honestly absent ───────── */}
          <AdminCol span={7}>
            <DossierInvestisseur ok={reponse.ok} identite={identite} motif={motif} />
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Profile source</h3><p className={gcc.cellText}>{reponse.ok ? 'Reachable' : 'Unavailable'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Investor reason</h3><p className={gcc.cellText}>{motif ?? 'None reported'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Role mapping</h3><p className={gcc.cellText}>Session role does not imply subscription.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Profile notes">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Data doctrine</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>Admin identity and investor identity are rendered separately.</p>
            <p className={gcc.cellText}>Absence of investor record is explicit, never implied as outage.</p>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Session source</h3><p className={gcc.cellText}>`getSession()`</p></article>
          <article className={gcc.infoCell}><h3>Profile source</h3><p className={gcc.cellText}>`profile` backend endpoint</p></article>
          <article className={gcc.infoCell}><h3>Investor fields</h3><p className={gcc.cellText}>Name, email, wallet, KYC, accreditation</p></article>
          <article className={gcc.infoCell}><h3>Fallback</h3><p className={gcc.cellText}>No fabricated investor row</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Coverage path</h3>
          <p className={gcc.cellText}>Use `/admin/dashboard` for endpoint-level status reasons.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
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
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 sm:px-6">
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
