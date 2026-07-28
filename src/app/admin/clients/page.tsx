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
  return <span className="text-zinc-500 dark:text-zinc-400">—</span>
}

const COLONNES: readonly AdminTableColumn<LigneVide>[] = COLONNES_ATTENDUES.map((header) => ({
  key: header,
  header,
  cell: cellVide,
}))

export default function Page() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        description="Organisations, personnes et portefeuilles — annuaire en attente de source backend."
      />

      <AdminSection title="Annuaire" description="Table prête — aucune donnée simulée" index="01">
        <AdminToolbar>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Recherche — inactive</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">·</span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Filtres — en attente de source</span>
          <span className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
            Tri et pagination disponibles à l’arrivée de la source
          </span>
        </AdminToolbar>
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

      <AdminSection title="Sources" description="Ce que le service doit encore exposer" index="02">
        <AdminSourceAttendue
          quoi="Endpoints attendus"
          detail="Organisations et investisseurs ne sont pas encore exposés en HTTP."
          requis={[
            'Entité Organisation dans le modèle de données',
            'GET annuaire avec encours, conformité et risque',
            'Rattachement personnes, portefeuilles et souscriptions',
          ]}
        />
      </AdminSection>
    </div>
  )
}
