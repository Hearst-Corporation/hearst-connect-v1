import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { Panel, PanelHeader, SourceAttendue } from '@/components/compositions'
import { AppRail } from '@/components/layout/app-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, ROLE_LABELS } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

/**
 * Profil — surface USER.
 *
 * Jumeau de `/admin/profilee`, présenté dans l'espace propriétaire. Deux
 * identités coexistent et ne se confondent pas : le COMPTE, qui vous connecte
 * (toujours présent — vous êtes connecté), et le DOSSIER INVESTISSEUR, qui
 * relie une personne à une position dans le fonds (présent seulement pour qui a
 * souscrit). L'absence de dossier est le cas normal, jamais une panne.
 *
 * Aucun changement de contrat : mêmes endpoints session-tier (`profile` +
 * session), même Design System. Seul le rail change (`AppRail`).
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

function DossierInvestisseur({
  ok,
  identite,
  motif,
}: Readonly<{ ok: boolean; identite: Identite | null | undefined; motif: string | undefined }>) {
  if (!ok) {
    return (
      <SourceAttendue
        quoi="The investor file could not be read"
        detail="The service did not respond. This silence does not mean no file exists."
        requis={['A response from the service']}
      />
    )
  }

  if (identite === null || identite === undefined) {
    const suffixe =
      motif === undefined
        ? 'The service was reached: it finds no file linked to this account.'
        : `The service was reached: ${motif}.`
    return (
      <SourceAttendue
        quoi="No investor file is linked to this account"
        detail={`${suffixe} Managing the account and subscribing to the fund are distinct, and one does not imply the other. No file is shown here rather than an empty file that would look like a lost one.`}
        requis={[
          'A fund subscription completed with this email address',
          'A KYC file reviewed and approved',
          'A wallet address linked to the file',
        ]}
      />
    )
  }

  return (
    <Panel>
      <PanelHeader title="Investor file" hint="Transmitted as-is by the service, unedited" />
      <dl className="divide-y divide-console-line-soft">
        <Ligne libelle="File name" valeur={identite.displayName} />
        <Ligne libelle="Email address" valeur={identite.email} />
        <Ligne libelle="Wallet" valeur={identite.walletAddress} mono />
        <Ligne libelle="KYC" valeur={identite.kycStatus} />
        <Ligne libelle="Accreditation" valeur={identite.accreditation} />
      </dl>
    </Panel>
  )
}

export default async function Page() {
  const [session, reponse] = await Promise.all([getSession(), callBackend<ReponseProfil>('profile')])
  const railUserName = session?.name ?? 'Hearst user'
  const railUserRole = session?.role ?? 'MEMBER'

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)
  const sessionState = session === null ? 'No valid session' : 'Active session'
  const investorState =
    identite === null || identite === undefined ? 'No investor file' : 'Investor file present'

  return (
    <ConsoleShell
      label="Profile — Hearst Connect Account"
      rail={<AppRail currentHref="/account/profile" userName={railUserName} userRole={railUserRole} />}
    >
      <section className={csl.metricsRow} aria-label="Profile summary">
        <Panel tone="plain" className={csl.metricCard}><h2>Session</h2><div className={csl.metricText}><Reading value={editorial(sessionState)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Name</h2><div className={csl.metricText}><Reading value={editorial(session?.name ?? '—')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Email</h2><div className={csl.metricText}><Reading value={editorial(session?.email ?? '—')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Role</h2><div className={csl.metricText}><Reading value={editorial(session === null ? '—' : ROLE_LABELS[session.role])} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Investor file</h2><div className={csl.metricText}><Reading value={editorial(investorState)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Account <span>identity</span></p>
          <p className={csl.decisionMeta}>{reponse.ok ? 'Profile endpoint reachable' : 'Profile endpoint unavailable'}</p>
          <p className={csl.decisionActionMuted}>Session and investor are distinct</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Profile identity">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Your account</h2></div>
          <div className={csl.heroBody}>
            <AdminSection
              title="Identity"
              description="Two things live here and they are not the same. The account is what signs you in; the investor file links a person to a position in the fund. One does not imply the other."
            >
              <AdminGrid>
                <AdminCol span={5}>
                  <Panel>
                    <PanelHeader title="Signed in as" hint="Read from your session, not from the service" />
                    {session === null ? (
                      <p className="px-5 py-6 text-sm text-danger-400 sm:px-6">
                        No valid session was found. Sign in again to view your account.
                      </p>
                    ) : (
                      <dl className="divide-y divide-console-line-soft">
                        <Ligne libelle="Name" valeur={session.name} />
                        <Ligne libelle="Email address" valeur={session.email} />
                        <Ligne libelle="Role" valeur={ROLE_LABELS[session.role]} />
                      </dl>
                    )}
                  </Panel>
                </AdminCol>

                <AdminCol span={7}>
                  <DossierInvestisseur ok={reponse.ok} identite={identite} motif={motif} />
                </AdminCol>
              </AdminGrid>
            </AdminSection>
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Profile source</h3><p className={csl.cellText}>{reponse.ok ? 'Reachable' : 'Unavailable'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Investor reason</h3><p className={csl.cellText}>{motif ?? 'None reported'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Role mapping</h3><p className={csl.cellText}>Session role does not imply a subscription.</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Profile notes">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Data doctrine</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Account identity and investor identity are rendered separately.</p>
            <p className={csl.cellText}>Missing investor file is explicit, never presented as an outage.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Session source</h3><p className={csl.cellText}>Browser encrypted session</p></article>
          <article className={csl.infoCell}><h3>Profile source</h3><p className={csl.cellText}>Backend profile endpoint</p></article>
          <article className={csl.infoCell}><h3>Investor fields</h3><p className={csl.cellText}>Name, email, wallet, KYC, accreditation</p></article>
          <article className={csl.infoCell}><h3>Fallback</h3><p className={csl.cellText}>No fabricated investor row</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Your account</h3>
          <p className={csl.cellText}>The dashboard brings together your data coverage.</p>
        </Panel>
      </section>
    </ConsoleShell>
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
      <dt className="w-40 shrink-0 text-sm text-fg-tertiary dark:text-fg-secondary">{libelle}</dt>
      <dd
        className={
          mono
            ? 'min-w-0 truncate font-mono text-sm text-fg-muted dark:text-fg-secondary'
            : 'min-w-0 text-sm text-ink dark:text-fg'
        }
      >
        {affiche}
      </dd>
    </div>
  )
}
