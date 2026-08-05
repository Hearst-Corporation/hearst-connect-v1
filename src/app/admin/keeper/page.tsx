import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import { Badge } from '@/components/catalyst/badge'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { editorial } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Actions Keeper' }
export const dynamic = 'force-dynamic'

function Prerequisite({
  libelle,
  valeur,
  satisfait,
}: Readonly<{ libelle: string; valeur: string; satisfait: boolean }>) {
  return (
    <>
      <DescriptionTerm>{libelle}</DescriptionTerm>
      <DescriptionDetails>
        <span
          className={clsx(
            satisfait ? 'text-zinc-950 dark:text-white' : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {valeur}
        </span>
      </DescriptionDetails>
    </>
  )
}

/**
 * Actions Keeper — Catalyst pur.
 * Les formulaires appellent les routes keeper du backend ; rien n’est signé on-chain.
 */
export default async function KeeperPage() {
  const session = await requireSession()
  const keeperEndpoints = endpointsByCategory('keeper')

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Le rôle ${session.role} ne donne pas accès aux actions Keeper.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL n’est pas défini : aucune requête ne peut être émise.'
  }

  const actionsDisponibles = disabledReason === null

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Actions Keeper"
        description="Ces routes journalisent une requête — elles ne signent rien. Chaque action exige la saisie de CONFIRM avant envoi."
      />

      <DescriptionList>
        <DescriptionTerm>Actions exposées</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(formatNumber(keeperEndpoints.length))} />
        </DescriptionDetails>
        <DescriptionTerm>Votre rôle</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(session.role)} />
        </DescriptionDetails>
        <DescriptionTerm>URL du backend</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(backendConfigured ? 'Configuré' : 'Non défini')} />
        </DescriptionDetails>
        <DescriptionTerm>Autorisation</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(isAdmin ? 'Accès administrateur' : 'Restreint')} />
        </DescriptionDetails>
        <DescriptionTerm>Disponibilité</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading
            value={editorial(actionsDisponibles ? 'Actions disponibles' : 'Actions inertes')}
          />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading
        title="Périmètre"
        description="Ces routes journalisent une requête — elles ne signent rien."
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Badge color="zinc">Aucune signature on-chain</Badge>
        <Text className="!mt-0 font-medium text-zinc-950 dark:text-white">
          Aucune de ces routes ne signe une transaction
        </Text>
      </div>
      <Text>
        Le backend n’a aucun assistant d’écriture on-chain : ces routes journalisent une requête, elles ne
        produisent ni signature ni hash de transaction. Trois d’entre elles renvoient actuellement un HTTP 501 avec
        un <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais un hash
        fabriqué.
      </Text>
      <Text>
        Deux garde-fous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le
        disjoncteur <span className="font-mono">KEEPER_ENABLED</span> — désactivé par défaut, il renvoie 503{' '}
        <span className="font-mono">NOT_CONFIGURED</span>.
      </Text>

      <AdminSectionHeading title="Peuvent-elles s’exécuter maintenant ?" />
      <DescriptionList>
        <Prerequisite libelle="Votre rôle" valeur={session.role} satisfait={isAdmin} />
        <Prerequisite
          libelle="Adresse du service"
          valeur={backendConfigured ? 'Configuré' : 'Non défini'}
          satisfait={backendConfigured}
        />
      </DescriptionList>
      {disabledReason ? (
        <Text className="text-amber-600 dark:text-amber-400">Actions inertes : {disabledReason}</Text>
      ) : (
        <Text>
          Les deux prérequis sont satisfaits. Le service peut tout de même refuser un appel — son disjoncteur et son
          quota sont vérifiés de son côté, et sa réponse est affichée sous l’action qui l’a déclenché.
        </Text>
      )}

      <AdminSectionHeading
        title="Actions"
        description={`${formatNumber(keeperEndpoints.length)} routes exposées par le service. Rien ne quitte cette page tant que le mot CONFIRM n’a pas été saisi dans le champ propre à l’action.`}
      />
      <div className="grid gap-6 md:grid-cols-2">
        {keeperEndpoints.map((endpoint) => (
          <KeeperForm
            key={endpoint.id}
            endpoint={endpoint}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
          />
        ))}
      </div>
    </div>
  )
}
