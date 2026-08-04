import { ConsoleShell, gcc } from '@/components/layout/console-shell'
import { Panel, PanelHeader, SourceAttendue } from '@/components/compositions'
import { ConsoleRail } from '@/components/layout/console-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, type Role } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = { title: 'Votre compte' }
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
  OWNER: 'Propriétaire de l’espace',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
}

function DossierInvestisseur({
  ok,
  identite,
  motif,
}: Readonly<{ ok: boolean; identite: Identite | null | undefined; motif: string | undefined }>) {
  if (!ok) {
    return (
      <SourceAttendue
        quoi="Le dossier investisseur n’a pas pu être lu"
        detail="Le service n’a pas répondu à la requête. Ce silence ne signifie pas qu’aucun dossier n’existe."
        requis={['Une réponse du service']}
      />
    )
  }

  if (identite === null || identite === undefined) {
    const suffixe =
      motif === undefined
        ? 'Le service a été joint : il ne trouve aucun dossier rattaché à ce compte.'
        : `Le service a été joint : ${motif}.`
    return (
      <SourceAttendue
        quoi="Aucun dossier investisseur n’est rattaché à ce compte"
        detail={`${suffixe} C’est le cas normal pour un compte administrateur — administrer l’espace et souscrire au fonds sont deux choses distinctes, et l’une n’implique pas l’autre. Aucun dossier n’est affiché ici plutôt qu’un dossier vide, qui ressemblerait à un dossier perdu.`}
        requis={[
          'Une souscription au fonds effectuée avec cette adresse e-mail',
          'Un dossier de connaissance client examiné et approuvé',
          'Une adresse de portefeuille rattachée au dossier',
        ]}
      />
    )
  }

  return (
    <Panel>
      <PanelHeader title="Dossier investisseur" hint="Transmis tel quel par le service, sans édition" />
      <dl className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
        <Ligne libelle="Nom du dossier" valeur={identite.displayName} />
        <Ligne libelle="Adresse e-mail" valeur={identite.email} />
        <Ligne libelle="Portefeuille" valeur={identite.walletAddress} mono />
        <Ligne libelle="Connaissance client" valeur={identite.kycStatus} />
        <Ligne libelle="Qualification" valeur={identite.accreditation} />
      </dl>
    </Panel>
  )
}

export default async function Page() {
  const [session, reponse] = await Promise.all([getSession(), callBackend<ReponseProfil>('profile')])
  const railUserName = session?.name ?? 'Utilisateur Hearst'
  const railUserRole = session?.role ?? 'MEMBER'

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)
  const sessionState = session === null ? 'Aucune session valide' : 'Session active'
  const investorState = identite === null || identite === undefined ? 'Aucun dossier investisseur' : 'Dossier investisseur présent'

  return (
    <ConsoleShell
      label="Poste de pilotage profil Hearst Connect"
      rail={<ConsoleRail currentHref="/admin/administration" userName={railUserName} userRole={railUserRole} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé du profil">
        <Panel tone="plain" className={gcc.metricCard}><h2>Session</h2><div className={gcc.metricText}><Reading value={editorial(sessionState)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Nom</h2><div className={gcc.metricText}><Reading value={editorial(session?.name ?? '—')} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>E-mail</h2><div className={gcc.metricText}><Reading value={editorial(session?.email ?? '—')} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Rôle</h2><div className={gcc.metricText}><Reading value={editorial(session === null ? '—' : LIBELLE_ROLE[session.role])} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.metricCard}><h2>Dossier investisseur</h2><div className={gcc.metricText}><Reading value={editorial(investorState)} className={gcc.metricValue} /></div></Panel>
        <Panel tone="plain" className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Identité <span>du compte</span></p>
          <p className={gcc.decisionMeta}>{reponse.ok ? 'Point d’accès profil joignable' : 'Point d’accès profil indisponible'}</p>
          <p className={gcc.decisionActionMuted}>La session et l’investisseur sont distincts</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Identité du profil">
        <Panel tone="plain" className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Votre compte</h2></div>
          <div className={gcc.heroBody}>
      <AdminSection
        title="Identité"
        description="Deux choses vivent ici et elles ne sont pas identiques. Le compte est ce qui vous connecte ; le dossier investisseur est ce qui relie une personne à une position dans le fonds. L’un n’implique pas l’autre."
      >
        <AdminGrid>
          {/* ── A. The signed-in account: the one certainty on this page ──── */}
          <AdminCol span={5}>
            <Panel>
              <PanelHeader title="Connecté en tant que" hint="Lu depuis votre session, pas depuis le service" />
              {session === null ? (
                <p className="px-5 py-6 text-sm text-danger-400 sm:px-6">
                  Aucune session valide n’a été trouvée. Reconnectez-vous pour consulter votre compte.
                </p>
              ) : (
                <dl className="divide-y divide-zinc-950/5 dark:divide-console-line-soft">
                  <Ligne libelle="Nom" valeur={session.name} />
                  <Ligne libelle="Adresse e-mail" valeur={session.email} />
                  <Ligne libelle="Rôle" valeur={LIBELLE_ROLE[session.role]} />
                </dl>
              )}
            </Panel>
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
          <Panel tone="plain" className={gcc.signalCard}><h3>Source du profil</h3><p className={gcc.cellText}>{reponse.ok ? 'Joignable' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Raison investisseur</h3><p className={gcc.cellText}>{motif ?? 'Aucune signalée'}</p></Panel>
          <Panel tone="plain" className={gcc.signalCard}><h3>Correspondance des rôles</h3><p className={gcc.cellText}>Le rôle de session n’implique pas de souscription.</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Notes du profil">
        <Panel tone="plain" className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Doctrine des données</h3></div>
          <div className={gcc.heroBody}>
            <p className={gcc.cellText}>L’identité administrateur et l’identité investisseur sont rendues séparément.</p>
            <p className={gcc.cellText}>L’absence de dossier investisseur est explicite, jamais présentée comme une panne.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Source de session</h3><p className={gcc.cellText}>`getSession()`</p></article>
          <article className={gcc.infoCell}><h3>Source du profil</h3><p className={gcc.cellText}>Point d’accès backend `profile`</p></article>
          <article className={gcc.infoCell}><h3>Champs investisseur</h3><p className={gcc.cellText}>Nom, e-mail, portefeuille, KYC, accréditation</p></article>
          <article className={gcc.infoCell}><h3>Repli</h3><p className={gcc.cellText}>Aucune ligne investisseur fabriquée</p></article>
        </Panel>
        <Panel tone="plain" className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Chemin de couverture</h3>
          <p className={gcc.cellText}>Utilisez `/admin/dashboard` pour les raisons d’état au niveau des points d’accès.</p>
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
