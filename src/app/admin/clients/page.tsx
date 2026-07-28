import { PageHeader } from '@/components/admin/page-header'
import {
  AdminEmptyState,
  AdminSection,
  AdminSourceAttendue,
  AdminSurface,
  AdminTable,
  AdminToolbar,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

/**
 * Clients — structure prête pour l’annuaire organisations/investisseurs.
 * Aucune ligne inventée tant que le backend n’expose pas la source.
 */

const COLONNES_ATTENDUES = [
  'Organisation',
  'Type',
  'Statut',
  'Conformité',
  'Risque',
  'Encours',
  'Dernière activité',
  'Personnes liées',
  'Portefeuille',
] as const

type LigneVide = Record<string, never>

function cellVide(_row: LigneVide) {
  return <span className="text-brand-muted">—</span>
}

const COLONNES: readonly AdminTableColumn<LigneVide>[] = COLONNES_ATTENDUES.map((header) => ({
  key: header,
  header,
  cell: cellVide,
}))

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Organisations, personnes et portefeuilles — annuaire en attente de source backend."
      />

      <AdminToolbar>
        <span className="text-sm text-brand-muted">Recherche — inactive</span>
        <span className="text-xs text-brand-muted">·</span>
        <span className="text-sm text-brand-muted">Filtres — en attente de source</span>
        <span className="ml-auto text-xs text-brand-muted">Tri et pagination disponibles à l’arrivée de la source</span>
      </AdminToolbar>

      <AdminSection title="Annuaire" description="Table prête — aucune donnée simulée">
        <AdminSurface>
          <AdminTable
            rows={[]}
            keyFn={() => ''}
            empty={
              <AdminEmptyState
                title="L’annuaire des organisations n’est pas encore ouvert"
                description="Le service ne transmet aucune organisation. Cette structure accueillera les données sans refonte graphique."
              />
            }
            columns={COLONNES}
          />
        </AdminSurface>
      </AdminSection>

      <AdminSourceAttendue
        quoi="Endpoints attendus"
        detail="Organisations et investisseurs ne sont pas encore exposés en HTTP."
        requis={[
          'Entité Organisation dans le modèle de données',
          'GET annuaire avec encours, conformité et risque',
          'Rattachement personnes, portefeuilles et souscriptions',
        ]}
      />
    </div>
  )
}
