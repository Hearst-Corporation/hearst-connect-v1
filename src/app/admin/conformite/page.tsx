import { PageHeader } from '@/components/admin/page-header'
import {
  AdminFilterBar,
  AdminSection,
  AdminSourceAttendue,
  AdminSurface,
  AdminTable,
} from '@/components/admin/surfaces'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conformité' }
export const dynamic = 'force-dynamic'

const SEGMENTS = [
  { id: 'a-verifier', label: 'À vérifier', aide: 'Dossier reçu, instruction non commencée' },
  { id: 'en-attente', label: 'En attente', aide: 'Document ou réponse attendue du client' },
  { id: 'risque-eleve', label: 'Risque élevé', aide: 'Signal sanctions, PEP ou média défavorable' },
  { id: 'a-renouveler', label: 'À renouveler', aide: 'Vérification arrivée à échéance' },
  { id: 'termine', label: 'Terminé', aide: 'Décision rendue et journalisée' },
] as const

const COLONNES_DOSSIER = ['Référence', 'Organisation', 'Segment', 'Ancienneté', 'Échéance', 'Risque', 'Analyste'] as const

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformité"
        description="File d’instruction KYC/KYB. Segments du parcours dossier — compteurs vides tant qu’aucune source n’est branchée."
      />

      <AdminSection title="Segments" description="Parcours d’un dossier de connaissance client">
        <AdminFilterBar
          ariaLabel="Segments de conformité"
          items={SEGMENTS.map((s) => ({ id: s.id, label: s.label, title: s.aide }))}
        />
      </AdminSection>

      <AdminSection title="File de travail" description="Dossiers transmis par le backend — vide pour l’instant">
        <AdminSurface>
          <AdminTable
            rows={[]}
            keyFn={() => ''}
            empty={
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold text-brand-foreground">Aucun dossier transmis</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-brand-muted">
                  Les segments ci-dessus décrivent le parcours réel. Aucun zéro n’est affiché — cela signifierait « rien à traiter ».
                </p>
              </div>
            }
            columns={COLONNES_DOSSIER.map((header) => ({
              key: header,
              header,
              cell: () => <span className="text-brand-muted">—</span>,
            }))}
          />
        </AdminSurface>
      </AdminSection>

      <AdminSourceAttendue
        quoi="Endpoints KYC/KYB en attente"
        detail="Le détail dossier (UBO, sanctions, PEP, historique) s’ouvrira dans un panneau latéral à l’arrivée de la source."
        requis={[
          'Lecture des dossiers avec état, ancienneté et échéance',
          'Détail : bénéficiaires effectifs, pièces, contrôles sanctions et PEP',
          'Actions de décision uniquement si exposées par le backend',
          'Assignation analyste et journal des décisions',
        ]}
      />
    </div>
  )
}
