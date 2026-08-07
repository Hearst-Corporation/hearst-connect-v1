import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminSurface } from '@/components/admin/surfaces'
import { AdminBody } from '@/components/admin/typography'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { LIBELLE_ROLE } from '@/lib/session'
import type { Metadata } from 'next'
import { CreateClientForm } from './create-client-form'

export const metadata: Metadata = { title: 'Nouveau client simulé' }
export const dynamic = 'force-dynamic'

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
    <div className="space-y-10">
      <AdminPageHeader
        title="Nouveau client simulé"
        description="Crée un compte via POST /api/v1/admin/users. Une réponse 201 reste une création réelle — aucune ligne inventée côté front."
      />

      <AdminSurface padding>
        <AdminBody>
          Le simulateur client crée un compte investisseur (ou admin) en base. Le service ne renvoie jamais le mot de
          passe : seuls l’identifiant, l’email et le rôle sont affichés après succès.
        </AdminBody>
        <CreateClientForm disabled={!canPost} disabledReason={disabledReason} />
      </AdminSurface>

      <Text>
        <Link href="/admin/clients" className="underline">Retour à l’annuaire clients</Link>
      </Text>
    </div>
  )
}
