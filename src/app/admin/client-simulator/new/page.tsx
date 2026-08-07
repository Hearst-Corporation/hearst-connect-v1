import { AdminPageHeader } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { ChartFrame } from '@/components/charts'
import { SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { LIBELLE_ROLE } from '@/lib/session'
import type { Metadata } from 'next'
import { CreateClientForm } from './create-client-form'

export const metadata: Metadata = { title: 'Nouveau client simulé' }
export const dynamic = 'force-dynamic'

const CHAMPS_REQUIS = [
  'Email — identifiant de connexion du compte',
  'Mot de passe — min. 8 caractères, jamais restitué par le service',
  'Rôle — investor (client simulé) ou admin',
  'CONFIRM — garde-fou explicite avant tout envoi',
] as const

const NON_RESTITUE = [
  'Le mot de passe : le backend ne le renvoie jamais, aucune copie côté front',
  'Aucune donnée de démonstration : une 201 est une création réelle en base',
  'L’indexation dans l’annuaire peut prendre un instant après la création',
] as const

/**
 * Nouveau client simulé — POST /api/v1/admin/users (admin only).
 * Crée un compte réel en base ; le mot de passe n’est jamais restitué par le service.
 */
export default async function Page() {
  const session = await requireSession()

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Le rôle « ${LIBELLE_ROLE[session.role]} » ne donne pas accès à la création de comptes.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL n’est pas défini : aucune requête ne peut être émise.'
  }

  const canPost = disabledReason === null

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Nouveau client simulé" />

      <StatGrid label="État de la requête de création" columns={3}>
        <StatCard
          titre="Votre rôle"
          valeur={LIBELLE_ROLE[session.role]}
          hint={isAdmin ? 'Habilité à créer un compte' : 'Non habilité pour cette action'}
        />
        <StatCard
          titre="Backend"
          valeur={backendConfigured ? 'Configuré' : 'Non configuré'}
          hint={backendConfigured ? 'HEARST_API_URL présent' : 'HEARST_API_URL absent'}
        />
        <StatCard
          titre="Envoi possible"
          valeur={canPost ? 'Prêt' : 'Bloqué'}
          hint={canPost ? 'Rôle et backend réunis' : 'Condition manquante ci-dessous'}
        />
      </StatGrid>

      <SectionCard title="Créations récentes" hint="Comptes créés depuis cet écran, par jour." tone="chart">
        <ChartFrame
          question="Créations de comptes par jour"
          unite="comptes / jour"
          etat={{
            type: 'vide',
            explication:
              'Aucune série à tracer : cet écran émet une création à la fois et ne mesure pas d’historique. Le décompte réel des comptes vit dans l’annuaire clients.',
          }}
        />
      </SectionCard>

      <SectionCard
        title="Créer un compte investisseur ou admin"
        hint="Le service ne renvoie jamais le mot de passe : seuls l’identifiant, l’email et le rôle sont affichés après succès."
      >
        <CreateClientForm disabled={!canPost} disabledReason={disabledReason} />
      </SectionCard>

      <SectionCard title="Champs de la requête" hint="Ce que POST /api/v1/admin/users attend." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {CHAMPS_REQUIS.map((champ) => (
            <li key={champ}>{champ}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Ce qui n’est pas restitué" hint="Règle de véracité du simulateur." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {NON_RESTITUE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <Text>
        <Link href="/admin/clients" className="underline">Retour à l’annuaire clients</Link>
      </Text>
    </div>
  )
}
