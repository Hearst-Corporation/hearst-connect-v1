import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import { ADMIN_SECONDARY, CLIENTS_ENTRY, VAULT_REGISTRY_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { editorial } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

const SCREEN_COUNT = ADMIN_SECONDARY.reduce((total, group) => total + group.entrees.length, 0)

export default async function Page() {
  const session = await requireSession()

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Administration"
        description="Compte connecté et destinations secondaires de la console. Le journal d’administration n’est pas exposé par le backend."
      />

      <DescriptionList>
        <DescriptionTerm>Compte</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(session.name)} />
        </DescriptionDetails>
        <DescriptionTerm>E-mail</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(session.email)} />
        </DescriptionDetails>
        <DescriptionTerm>Rôle</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(session.role)} />
        </DescriptionDetails>
        <DescriptionTerm>Écrans secondaires</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(String(SCREEN_COUNT))} />
        </DescriptionDetails>
        <DescriptionTerm>Source du journal admin</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial('Non exposé')} />
        </DescriptionDetails>
      </DescriptionList>

      <Text>
        <Link href={VAULT_REGISTRY_ENTRY.href} className="underline">
          {VAULT_REGISTRY_ENTRY.libelle}
        </Link>
        {' · '}
        <Link href={CLIENTS_ENTRY.href} className="underline">
          {CLIENTS_ENTRY.libelle}
        </Link>
      </Text>

      <AdminSectionHeading title="Écrans secondaires" />
      <DescriptionList>
        {ADMIN_SECONDARY.flatMap((group) =>
          group.entrees.map((entry) => (
            <div key={entry.href} className="contents">
              <DescriptionTerm>
                <Link href={entry.href} className="underline">
                  {entry.libelle}
                </Link>
              </DescriptionTerm>
              <DescriptionDetails>{entry.detail}</DescriptionDetails>
            </div>
          )),
        )}
      </DescriptionList>
    </div>
  )
}
