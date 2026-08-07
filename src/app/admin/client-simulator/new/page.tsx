import { AdminPageHeader, type AdminHeroKpi } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { ChartFrame } from '@/components/charts'
import { SectionCard } from '@/components/compositions'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { LIBELLE_ROLE } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import {
  PaperAirplaneIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
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

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'role',
      title: 'Votre rôle',
      value: editorial(LIBELLE_ROLE[session.role]),
      icon: UserIcon,
    },
    {
      id: 'backend',
      title: 'Backend',
      value: editorial(backendConfigured ? 'Configuré' : 'Non configuré'),
      icon: ServerIcon,
    },
    {
      id: 'envoi',
      title: 'Envoi possible',
      value: editorial(canPost ? 'Prêt' : 'Bloqué'),
      icon: PaperAirplaneIcon,
    },
  ]

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Nouveau client simulé"
        description="Création réelle via POST /api/v1/admin/users — mot de passe jamais restitué."
        kpis={kpis}
      />

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
