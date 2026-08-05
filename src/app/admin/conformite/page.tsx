import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Link } from '@/components/catalyst/link'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { DATA_COVERAGE_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { dateLisible, etatSourceLisible } from '@/lib/mouvements'
import { isAvailable, mapAvailability, measuredCount } from '@/lib/vaults/model'
import { MOVEMENT_WINDOW } from '@/lib/vaults/overview'
import { loadAdminRegistry } from '@/lib/vaults/registry'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Conformité' }
export const dynamic = 'force-dynamic'

const SEGMENTS = [
  { id: 'a-verifier', label: 'À vérifier', hint: 'Dossier reçu, revue non commencée' },
  { id: 'en-attente', label: 'En attente', hint: 'Document ou réponse attendu du client' },
  { id: 'risque-eleve', label: 'Risque élevé', hint: 'Signal de sanctions, PPE ou médias défavorables' },
  { id: 'a-renouveler', label: 'À renouveler', hint: 'La vérification a atteint son échéance' },
  { id: 'termine', label: 'Terminé', hint: 'Décision rendue et journalisée' },
] as const

const MISSING_FROM_SOURCE = [
  'Détail : bénéficiaires effectifs, documents, contrôles sanctions et PPE',
  'Actions de décision uniquement si exposées par le backend',
  'Affectation d’analyste et journal des décisions',
] as const

export default async function Page() {
  const session = await requireSession()
  const registry = await loadAdminRegistry(session.name, { movementLimit: MOVEMENT_WINDOW })

  const queueSource = mapAvailability(registry.compliance, (rows) =>
    rows.length === 0 ? 'File vide' : `${rows.length} dossier(s) en file`,
  )
  const clientExceptions = mapAvailability(registry.clientExceptions, (rows) => formatNumber(rows.length))
  const dossierCount = measuredCount(registry.compliance)
  const stages = mapAvailability(registry.compliance, (rows) => formatNumber(new Set(rows.map((row) => row.stage)).size))
  const reviews = isAvailable(registry.compliance) ? registry.compliance.value : null

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Conformité"
        description="File de revue issue de GET /api/v1/compliance (rôle admin). Une file vide reste vide — aucun dossier inventé."
      />

      <DescriptionList>
        <DescriptionTerm>Source de la file</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={queueSource} />
        </DescriptionDetails>
        <DescriptionTerm>Dossiers</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={dossierCount} />
        </DescriptionDetails>
        <DescriptionTerm>Étapes du processus</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={stages} />
        </DescriptionDetails>
        <DescriptionTerm>Anomalies clients</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={clientExceptions} />
        </DescriptionDetails>
      </DescriptionList>

      <AdminSectionHeading title="File de revue" description="Source /api/v1/compliance uniquement." />
      {reviews === null ? (
        <Text>La file de conformité n’a pas pu être lue.</Text>
      ) : reviews.length === 0 ? (
        <Text>Aucun dossier KYC en file pour l’instant.</Text>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Client</TableHeader>
              <TableHeader>Étape</TableHeader>
              <TableHeader>KYC</TableHeader>
              <TableHeader>Ouvert</TableHeader>
              <TableHeader>Dernier événement</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">{review.clientLabel}</TableCell>
                <TableCell>{review.stage}</TableCell>
                <TableCell>{review.kycStatus}</TableCell>
                <TableCell>{dateLisible(review.openedAt)}</TableCell>
                <TableCell>{dateLisible(review.lastEventAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Text>
        <Link href={DATA_COVERAGE_ENTRY.href} className="underline">
          {DATA_COVERAGE_ENTRY.libelle}
        </Link>
        {' · '}
        <Link href="/admin/operations" className="underline">
          Opérations
        </Link>
        {' · '}
        <Link href="/admin/clients" className="underline">
          Clients
        </Link>
      </Text>

      <AdminSectionHeading title="Parcours du dossier" description="Définition UI — pas des compteurs." />
      <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
        {SEGMENTS.map((segment, index) => (
          <li key={segment.id}>
            {index + 1}. {segment.label} · {segment.hint}
          </li>
        ))}
      </ul>

      <AdminSectionHeading title="Manquant à la source" />
      <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
        {MISSING_FROM_SOURCE.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <AdminSectionHeading title="Activité des sources" />
      <DescriptionList>
        {registry.sources.slice(0, 6).map((source) => (
          <div key={source.endpointId} className="contents">
            <DescriptionTerm>{source.label}</DescriptionTerm>
            <DescriptionDetails>{etatSourceLisible(source.status)}</DescriptionDetails>
          </div>
        ))}
      </DescriptionList>
    </div>
  )
}
