import { SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — l'entrée par l'organisation.
 *
 * Cette page attend une source. Le service n'expose aucun annuaire : il
 * n'existe pas de route pour lire les organisations, et le modèle de données
 * lui-même n'a pas d'entité `Organization` — l'entité la plus proche,
 * `Investor`, est vide en production.
 *
 * On pourrait dessiner un tableau à colonnes vides. Ce serait indiscernable
 * d'un annuaire réel qui n'aurait pas encore de client, et indiscernable
 * aussi d'une panne. La page dit donc précisément ce qui manque, et ce qu'il
 * faudra pour l'ouvrir.
 */
export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Les organisations, leurs personnes, leurs portefeuilles et leurs mouvements — réunis autour d’une seule fiche."
      />

      <SourceAttendue
        quoi="L’annuaire des organisations n’est pas encore ouvert"
        detail="Le service ne transmet aucune organisation aujourd’hui. Plutôt qu’un tableau vide — qu’on prendrait pour une panne ou pour un portefeuille sans client — cette page nomme ce qui manque."
        requis={[
          'Une entité Organisation dans le modèle de données : elle n’existe pas encore, seul un enregistrement Investisseur s’en approche',
          'Une lecture de l’annuaire, avec l’encours, l’état de conformité et le niveau de risque de chaque organisation',
          'Le rattachement des personnes, des portefeuilles autorisés et des souscriptions à leur organisation',
        ]}
      />
    </div>
  )
}
