import { AdminPageHeader } from '@/components/admin/page-header'
import { Link } from '@/components/catalyst/link'
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { ChartFrame, HearstDonutChart, type DonutSlice } from '@/components/charts'
import { Callout, DataTableShell, SectionCard, StatCard, StatGrid } from '@/components/compositions'
import { DATA_COVERAGE_ENTRY } from '@/lib/admin-nav'
import { requireSession } from '@/lib/auth'
import { formatNumber } from '@/lib/format'
import { libelleEtape, libelleKyc } from '@/lib/libelles'
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
  // le backend), et le total est réel (= nombre de dossiers en file). Le statut
  // KYC est une part d'un tout (un dossier porte exactement un statut), donc un
  // donut le rend au plus juste. On ne le trace qu'au-delà de deux statuts
  // distincts — sous ce seuil, le tableau seul reste plus honnête (§3.3).
  const parKyc = new Map<string, number>()
  for (const review of reviews ?? []) {
    const vu = parKyc.get(review.kycStatus)
    parKyc.set(review.kycStatus, vu === undefined ? 1 : vu + 1)
  }
  const kycSlices: readonly DonutSlice[] = [...parKyc.entries()]
    .map(([code, value]) => ({ label: libelleKyc(code), value }))
    .sort((a, b) => b.value - a.value)

  // La file de revue est-elle assez fournie pour être comptée sur le badge ?
  const reviewCount = isAvailable(dossierCount) ? `${dossierCount.value} dossier(s)` : undefined
  const sourceCount = `${formatNumber(registry.sources.length)} source(s)`

  return (
    <div className="space-y-10">
      {/* ── EN-TÊTE ──────────────────────────────────────────────── */}
      <AdminPageHeader
        title="Conformité"
        description="File de revue issue de GET /api/v1/compliance (rôle admin). Une file vide reste vide — aucun dossier inventé."
      />

      {/* ── RANGÉE KPI ───────────────────────────────────────────── */}
      <StatGrid label="Indicateurs de conformité" columns={4}>
        <StatCard titre="Source de la file" valeur={queueSource} hint="État de /api/v1/compliance" />
        <StatCard titre="Dossiers" valeur={dossierCount} hint="En file de revue" />
        <StatCard titre="Étapes du processus" valeur={stages} hint="Paliers distincts en cours" />
        <StatCard titre="Anomalies clients" valeur={clientExceptions} hint="Signaux à traiter" />
      </StatGrid>

      {/* ── CHART RÉEL : répartition par statut KYC ──────────────── */}
      <ChartFrame
        question="Comment la file se répartit-elle par statut KYC ?"
        unite="nombre de dossiers, par statut"
        expectedSource={['GET /api/v1/compliance']}
        etat={
          reviews === null
            ? { type: 'indisponible', explication: 'La lecture des dossiers de conformité n’a pas abouti.' }
            : reviews.length === 0
              ? { type: 'vide', explication: 'La file de revue est vide — rien à répartir pour l’instant.' }
              : kycSlices.length < 2
                ? {
                    type: 'vide',
                    explication:
                      'Un seul statut KYC en file : la répartition n’a de sens qu’à partir de deux. Voir le tableau ci-dessous.',
                  }
                : { type: 'tracee' }
        }
      >
        {reviews !== null && kycSlices.length >= 2 ? (
          <HearstDonutChart slices={kycSlices} unit="dossiers" />
        ) : null}
      </ChartFrame>

      {/* ── TABLE NOMMÉE : file de revue ─────────────────────────── */}
      {reviews === null ? (
        <Callout tone="warning" title="File de revue illisible">
          La file de conformité n’a pas pu être lue.
        </Callout>
      ) : (
        <DataTableShell
          title="File de revue"
          description="Source /api/v1/compliance uniquement."
          count={reviewCount}
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
                    <TableCell>{libelleEtape(review.stage)}</TableCell>
                    <TableCell>{libelleKyc(review.kycStatus)}</TableCell>
                    <TableCell>{dateLisible(review.openedAt)}</TableCell>
                    <TableCell>{dateLisible(review.lastEventAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </>
          ) : null}
        </DataTableShell>
      )}

      {/* ── SECTIONS ÉDITORIALES ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Parcours du dossier" hint="Définition UI — pas des compteurs." tone="plain">
          <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
            {SEGMENTS.map((segment, index) => (
              <li key={segment.id}>
                {index + 1}. {segment.label} · {segment.hint}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Manquant à la source" hint="Ce que /api/v1/compliance n’expose pas encore." tone="plain">
          <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
            {MISSING_FROM_SOURCE.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* ── TABLE NOMMÉE : santé des sources ─────────────────────── */}
      <DataTableShell
        title="Activité des sources"
        description="Six sources les plus récentes."
        count={sourceCount}
      >
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

      {/* ── LIENS DE NAVIGATION ──────────────────────────────────── */}
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
    </div>
  )
}
