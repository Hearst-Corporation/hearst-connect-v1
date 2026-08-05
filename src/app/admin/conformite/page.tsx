import { AdminPageHeader } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, MuiDistributionChart, type DistributionItem } from '@/components/charts'
import { Callout, DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
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
  const stages = mapAvailability(registry.compliance, (rows) =>
    formatNumber(new Set(rows.map((row) => row.stage)).size),
  )
  const reviews = isAvailable(registry.compliance) ? registry.compliance.value : null

  // Répartition des dossiers par statut KYC : chaque dossier porte réellement
  // ce champ (regroupement d'une donnée par ligne, pas un compteur inventé par
  // le backend), et le total est réel (= nombre de dossiers en file). Ne se
  // trace qu'au-delà de deux dossiers, sinon le tableau seul reste plus honnête.
  const parKyc = new Map<string, number>()
  for (const review of reviews ?? []) {
    const vu = parKyc.get(review.kycStatus)
    parKyc.set(review.kycStatus, vu === undefined ? 1 : vu + 1)
  }
  const distributionKyc: readonly DistributionItem[] = [...parKyc.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Conformité"
        description="File de revue issue de GET /api/v1/compliance (rôle admin). Une file vide reste vide — aucun dossier inventé."
      />

      <StatGrid label="Indicateurs de conformité" columns={4}>
        <StatCard titre="Source de la file" valeur={queueSource} hint="État de /api/v1/compliance" />
        <StatCard titre="Dossiers" valeur={dossierCount} hint="En file de revue" />
        <StatCard titre="Étapes du processus" valeur={stages} hint="Paliers distincts en cours" />
        <StatCard titre="Anomalies clients" valeur={clientExceptions} hint="Signaux à traiter" />
      </StatGrid>

      {reviews === null ? (
        <Callout tone="warning" title="File de revue illisible">
          La file de conformité n’a pas pu être lue.
        </Callout>
      ) : (
        <DataTableShell
          title="File de revue"
          description="Source /api/v1/compliance uniquement."
          calme={reviews.length === 0 ? 'Aucun dossier KYC en file pour l’instant.' : undefined}
        >
          {reviews.length > 0 ? (
            <>
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
            </>
          ) : null}
        </DataTableShell>
      )}

      <ChartFrame
        question="Comment la file se répartit-elle par statut KYC ?"
        unite="nombre de dossiers, par statut"
        etat={
          reviews === null
            ? { type: 'indisponible', explication: 'La lecture des dossiers de conformité n’a pas abouti.' }
            : { type: 'tracee' }
        }
      >
        <MuiDistributionChart items={distributionKyc} />
      </ChartFrame>

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

      <SectionCard title="Parcours du dossier" hint="Définition UI — pas des compteurs." tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {SEGMENTS.map((segment, index) => (
            <li key={segment.id}>
              {index + 1}. {segment.label} · {segment.hint}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Manquant à la source" tone="plain">
        <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
          {MISSING_FROM_SOURCE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>

      <DataTableShell title="Activité des sources" description="Six sources les plus récentes.">
        <TableHead>
          <TableRow>
            <TableHeader>Source</TableHeader>
            <TableHeader>État</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {registry.sources.slice(0, 6).map((source) => (
            <TableRow key={source.endpointId}>
              <TableCell className="font-medium">{source.label}</TableCell>
              <TableCell>{etatSourceLisible(source.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </DataTableShell>
    </div>
  )
}
