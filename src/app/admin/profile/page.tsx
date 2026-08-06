import { AdminPageHeader } from '@/components/admin/page-header'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { Callout, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import { getSession, type Role } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Votre compte' }
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

const LIBELLE_ROLE: Record<Role, string> = {
  OWNER: 'Propriétaire de l’espace',
  ADMIN: 'Administrateur',
  MEMBER: 'Membre',
}

function valeurLisible(valeur: string | null | undefined): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—'
  return valeur
}

export default async function Page() {
  const [session, reponse] = await Promise.all([getSession(), callBackend<ReponseProfil>('profile')])

  const bloc = reponse.ok ? reponse.data.identity : undefined
  const identite = bloc?.value
  const motif = motifLisible(bloc?.reason)
  const sessionState = session === null ? 'Aucune session valide' : 'Session active'
  const investorState =
    identite === null || identite === undefined ? 'Aucun dossier investisseur' : 'Dossier investisseur présent'

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Votre compte"
        description="Deux choses vivent ici et elles ne sont pas identiques. Le compte est ce qui vous connecte ; le dossier investisseur est ce qui relie une personne à une position dans le fonds."
      />

      <StatGrid label="Aperçu du compte" columns={3}>
        <StatCard titre="Session" valeur={editorial(sessionState)} />
        <StatCard titre="Nom" valeur={editorial(session?.name ?? '—')} />
        <StatCard titre="E-mail" valeur={editorial(session?.email ?? '—')} />
        <StatCard titre="Rôle" valeur={editorial(session === null ? '—' : LIBELLE_ROLE[session.role])} />
        <StatCard titre="Dossier investisseur" valeur={editorial(investorState)} />
        <StatCard titre="Source du profil" valeur={editorial(reponse.ok ? 'Joignable' : 'Indisponible')} />
      </StatGrid>

      <SectionCard title="Connecté en tant que" hint="Lu depuis votre session, pas depuis le service.">
        {session === null ? (
          <Callout tone="warning" title="Aucune session valide">
            Aucune session valide n’a été trouvée. Reconnectez-vous pour consulter votre compte.
          </Callout>
        ) : (
          <DescriptionList>
            <DescriptionTerm>Nom</DescriptionTerm>
            <DescriptionDetails>{session.name}</DescriptionDetails>
            <DescriptionTerm>Adresse e-mail</DescriptionTerm>
            <DescriptionDetails>{session.email}</DescriptionDetails>
            <DescriptionTerm>Rôle</DescriptionTerm>
            <DescriptionDetails>{LIBELLE_ROLE[session.role]}</DescriptionDetails>
          </DescriptionList>
        )}
      </SectionCard>

      <SectionCard title="Dossier investisseur" hint="Transmis tel quel par le service, sans édition.">
        {!reponse.ok ? (
          <Callout tone="warning" title="Dossier illisible">
            Le dossier investisseur n’a pas pu être lu. Le service n’a pas répondu à la requête — ce silence ne
            signifie pas qu’aucun dossier n’existe.
          </Callout>
        ) : identite === null || identite === undefined ? (
          <>
            <Text>
              Aucun dossier investisseur n’est rattaché à ce compte.
              {motif === undefined
                ? ' Le service a été joint : il ne trouve aucun dossier rattaché à ce compte.'
                : ` Le service a été joint : ${motif}.`}
            </Text>
            <Text className="mt-4">
              C’est le cas normal pour un compte administrateur — administrer l’espace et souscrire au fonds sont deux
              choses distinctes, et l’une n’implique pas l’autre. Aucun dossier n’est affiché ici plutôt qu’un dossier
              vide, qui ressemblerait à un dossier perdu.
            </Text>
            <Text className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">Pour qu’un dossier apparaisse</Text>
            <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
              <li>Une souscription au fonds effectuée avec cette adresse e-mail</li>
              <li>Un dossier de connaissance client examiné et approuvé</li>
              <li>Une adresse de portefeuille rattachée au dossier</li>
            </ul>
          </>
        ) : (
          <DescriptionList>
            <DescriptionTerm>Nom du dossier</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.displayName)}</DescriptionDetails>
            <DescriptionTerm>Adresse e-mail</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.email)}</DescriptionDetails>
            <DescriptionTerm>Portefeuille</DescriptionTerm>
            <DescriptionDetails className="font-mono text-sm">
              {valeurLisible(identite.walletAddress)}
            </DescriptionDetails>
            <DescriptionTerm>Connaissance client</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.kycStatus)}</DescriptionDetails>
            <DescriptionTerm>Qualification</DescriptionTerm>
            <DescriptionDetails>{valeurLisible(identite.accreditation)}</DescriptionDetails>
          </DescriptionList>
        )}
      </SectionCard>

      <SectionCard title="Notes">
        <DescriptionList>
          <DescriptionTerm>Raison investisseur</DescriptionTerm>
          <DescriptionDetails>{motif ?? 'Aucune signalée'}</DescriptionDetails>
          <DescriptionTerm>Correspondance des rôles</DescriptionTerm>
          <DescriptionDetails>Le rôle de session n’implique pas de souscription.</DescriptionDetails>
          <DescriptionTerm>Chemin de couverture</DescriptionTerm>
          <DescriptionDetails>
            <Link href="/admin/runtime" className="underline">
              Couverture des données
            </Link>
            {' — '}
            raisons d’état au niveau des points d’accès.
          </DescriptionDetails>
        </DescriptionList>
      </SectionCard>
    </div>
  )
}
