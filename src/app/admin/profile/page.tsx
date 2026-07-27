import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, type Role } from '@/lib/session'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Votre compte' }
export const dynamic = 'force-dynamic'

/**
 * Votre compte — ce que le produit sait de la personne connectée.
 *
 * Deux identités coexistent et ne doivent surtout pas être confondues : le
 * compte d'administration, qui ouvre cette console, et le dossier investisseur,
 * qui rattache une personne à une position dans le fonds. Le premier existe
 * toujours — vous êtes connecté. Le second n'existe que pour qui a souscrit.
 *
 * Le service répond ici « partiel, aucune valeur » : c'est la réponse juste
 * pour un compte d'administration, pas une panne. La page le dit avec ces
 * mots-là plutôt que d'afficher une fiche d'identité vide, qu'on lirait comme
 * un dossier perdu.
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
        detail="Le service n’a pas répondu à la demande. On ne conclut pas de ce silence qu’aucun dossier n’existe."
        requis={['Une réponse du service']}
      />
    )
  }

  if (identite === null || identite === undefined) {
    const suffixe =
      motif === undefined
        ? 'Le service a bien été consulté : il ne trouve pas de dossier associé.'
        : `Le service a bien été consulté : ${motif}.`
    return (
      <SourceAttendue
        quoi="Aucun dossier investisseur n’est rattaché à ce compte"
        detail={`${suffixe} C’est le cas normal d’un compte d’administration — administrer l’espace et souscrire au fonds sont deux choses distinctes, et l’un n’implique pas l’autre. Aucune fiche n’est affichée ici plutôt qu’une fiche vide, qu’on prendrait pour un dossier perdu.`}
        requis={[
          'Une souscription au fonds effectuée avec cette adresse e-mail',
          'Un dossier de connaissance client instruit et validé',
          'Une adresse de portefeuille rattachée au dossier',
        ]}
      />
    )
  }

  return (
    <Card>
      <CardHeader title="Ce que le service sait de vous" hint="Transmis par le service, sans retouche" />
      <dl className="divide-y divide-white/[0.07]">
        <Ligne libelle="Nom du dossier" valeur={identite.displayName} />
        <Ligne libelle="Adresse e-mail" valeur={identite.email} />
        <Ligne libelle="Portefeuille" valeur={identite.walletAddress} mono />
        <Ligne libelle="Connaissance client" valeur={identite.kycStatus} />
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
    <div className="space-y-6">
      <PageHeader
        title="Votre compte"
        description="Le compte qui ouvre cette console, et le dossier investisseur qui lui est rattaché — s’il en existe un."
        endpointIds={['profile']}
      />

      {/* ── A. Le compte connecté : la seule certitude de cette page ────── */}
      <Card>
        <CardHeader title="Avec quel compte êtes-vous connecté ?" hint="Lu dans votre session, pas dans le service" />
        {session === null ? (
          <p className="px-5 py-6 text-sm text-danger-400">
            Aucune session valide n’a été trouvée. Reconnectez-vous pour afficher votre compte.
          </p>
        ) : (
          <dl className="divide-y divide-white/[0.07]">
            <Ligne libelle="Nom" valeur={session.name} />
            <Ligne libelle="Adresse e-mail" valeur={session.email} />
            <Ligne libelle="Rôle" valeur={LIBELLE_ROLE[session.role]} />
          </dl>
        )}
      </Card>

      {/* ── B. Le dossier investisseur : présent, ou honnêtement absent ─── */}
      <section aria-labelledby="dossier" className="space-y-3">
        <h2 id="dossier" className="text-sm font-semibold text-white">
          Dossier investisseur
        </h2>

        <DossierInvestisseur ok={reponse.ok} identite={identite} motif={motif} />
      </section>

      {/* Le sous-sol : la réponse détaillée pour qui veut vérifier un champ. */}
      <EndpointSection endpointId="profile" title="Réponse détaillée du service" />
    </div>
  )
}

/** Une valeur absente rend « — » : jamais une chaîne vide, jamais un zéro. */
function Ligne({
  libelle,
  valeur,
  mono = false,
}: Readonly<{ libelle: string; valeur: string | null | undefined; mono?: boolean }>) {
  const affiche = valeur === null || valeur === undefined || valeur === '' ? '—' : valeur
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
      <dt className="w-40 shrink-0 text-sm text-zinc-400">{libelle}</dt>
      <dd className={mono ? 'min-w-0 truncate font-mono text-sm text-zinc-200' : 'min-w-0 text-sm text-white'}>
        {affiche}
      </dd>
    </div>
  )
}
