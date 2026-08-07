import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { Panel, PanelHeader, SourceAttendue } from '@/components/compositions'
import { AppRail } from '@/components/layout/app-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, LIBELLE_ROLE } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profil' }
export const dynamic = 'force-dynamic'

/**
 * Profil — surface USER.
 *
 * Jumeau de `/admin/profile`, présenté dans l'espace propriétaire. Deux
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
        detail={`${suffixe} Administrer l’espace et souscrire au fonds sont deux choses distinctes, et l’une n’implique pas l’autre. Aucun dossier n’est affiché ici plutôt qu’un dossier vide, qui ressemblerait à un dossier perdu.`}
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
  const investorState =
    identite === null || identite === undefined ? 'Aucun dossier investisseur' : 'Dossier investisseur présent'

  return (
    <ConsoleShell
      label="Poste de pilotage profil — Espace Hearst Connect"
      rail={<AppRail currentHref="/espace/profil" userName={railUserName} userRole={railUserRole} />}
    >
      <section className={csl.metricsRow} aria-label="Résumé du profil">
        <Panel tone="plain" className={csl.metricCard}><h2>Session</h2><div className={csl.metricText}><Reading value={editorial(sessionState)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Nom</h2><div className={csl.metricText}><Reading value={editorial(session?.name ?? '—')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>E-mail</h2><div className={csl.metricText}><Reading value={editorial(session?.email ?? '—')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Rôle</h2><div className={csl.metricText}><Reading value={editorial(session === null ? '—' : LIBELLE_ROLE[session.role])} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Dossier investisseur</h2><div className={csl.metricText}><Reading value={editorial(investorState)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Identité <span>du compte</span></p>
          <p className={csl.decisionMeta}>{reponse.ok ? 'Point d’accès profil joignable' : 'Point d’accès profil indisponible'}</p>
          <p className={csl.decisionActionMuted}>La session et l’investisseur sont distincts</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Identité du profil">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Votre compte</h2></div>
          <div className={csl.heroBody}>
            <AdminSection
              title="Identité"
              description="Deux choses vivent ici et elles ne sont pas identiques. Le compte est ce qui vous connecte ; le dossier investisseur est ce qui relie une personne à une position dans le fonds. L’un n’implique pas l’autre."
            >
              <AdminGrid>
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

                <AdminCol span={7}>
                  <DossierInvestisseur ok={reponse.ok} identite={identite} motif={motif} />
                </AdminCol>
              </AdminGrid>
            </AdminSection>
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Source du profil</h3><p className={csl.cellText}>{reponse.ok ? 'Joignable' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Raison investisseur</h3><p className={csl.cellText}>{motif ?? 'Aucune signalée'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Correspondance des rôles</h3><p className={csl.cellText}>Le rôle de session n’implique pas de souscription.</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Notes du profil">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Doctrine des données</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>L’identité du compte et l’identité investisseur sont rendues séparément.</p>
            <p className={csl.cellText}>L’absence de dossier investisseur est explicite, jamais présentée comme une panne.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Source de session</h3><p className={csl.cellText}>Session chiffrée du navigateur</p></article>
          <article className={csl.infoCell}><h3>Source du profil</h3><p className={csl.cellText}>Point d’accès backend profil</p></article>
          <article className={csl.infoCell}><h3>Champs investisseur</h3><p className={csl.cellText}>Nom, e-mail, portefeuille, KYC, accréditation</p></article>
          <article className={csl.infoCell}><h3>Repli</h3><p className={csl.cellText}>Aucune ligne investisseur fabriquée</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Votre espace</h3>
          <p className={csl.cellText}>Le tableau de bord réunit la couverture de vos données.</p>
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
