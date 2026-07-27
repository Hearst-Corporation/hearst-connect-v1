import { Card, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conformité' }
export const dynamic = 'force-dynamic'

/**
 * Conformité — une file de traitement, pas un tableau de bord.
 *
 * Les segments sont volontairement des filtres, et non les colonnes d'un
 * kanban : cinq colonnes de cartes deviennent illisibles au-delà d'une
 * cinquantaine de dossiers et ne tiennent pas sur un téléphone, alors qu'une
 * file segmentée pagine, se trie et se traite en lot.
 *
 * Les segments sont affichés dès maintenant, sans compte : ils décrivent le
 * parcours d'un dossier, qui ne dépend pas de la présence de données. Aucun
 * nombre n'est avancé tant que le service n'en transmet pas — un « 0 » ici
 * signifierait « aucun dossier à traiter », ce que personne ne peut affirmer.
 */

const SEGMENTS = [
  { cle: 'a-verifier', libelle: 'À vérifier', aide: 'Dossier reçu, instruction non commencée' },
  { cle: 'en-attente', libelle: 'En attente', aide: 'Un document ou une réponse est attendu du client' },
  { cle: 'risque-eleve', libelle: 'Risque élevé', aide: 'Signal sanctions, PEP ou média défavorable' },
  { cle: 'a-renouveler', libelle: 'À renouveler', aide: 'Vérification arrivée à échéance' },
  { cle: 'termine', libelle: 'Terminé', aide: 'Décision rendue et journalisée' },
] as const

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Conformité"
        description="La file d’instruction des dossiers de connaissance client. Un dossier s’ouvre dans un panneau, sans quitter la file."
      />

      {/* Le parcours d'un dossier, lisible même sans données. */}
      <Card as="nav" className="px-2 py-2">
        <ul className="flex flex-wrap gap-1">
          {SEGMENTS.map((s) => (
            <li key={s.cle}>
              <span
                title={s.aide}
                aria-disabled="true"
                className="inline-flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500"
              >
                {s.libelle}
                <span className="text-xs text-zinc-600">—</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <SourceAttendue
        quoi="Aucun dossier n’est transmis pour le moment"
        detail="Le service n’expose pas encore les dossiers de connaissance client. Les segments ci-dessus décrivent le parcours réel d’un dossier ; leurs compteurs resteront vides tant qu’aucune donnée ne sera disponible, plutôt que d’afficher un zéro qui signifierait « rien à traiter »."
        requis={[
          'Une lecture des dossiers en cours, avec leur état, leur ancienneté et leur échéance',
          'Le détail d’un dossier : bénéficiaires effectifs, pièces reçues, contrôles sanctions et personnes politiquement exposées',
          'Les gestes de décision — approuver, escalader, rejeter, demander une pièce — avec écriture au journal',
          'L’assignation à un analyste : ni responsable ni échéance n’existent aujourd’hui dans le modèle de données',
        ]}
      />
    </div>
  )
}
