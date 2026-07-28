import { DistributionBarChart } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSurfaceHeader } from '@/components/admin/typography'
import {
  AdminErrorState,
  AdminSection,
  AdminSourceAttendue,
  AdminStatus,
  AdminSurface,
  AdminTable,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import { callBackend, statusFromMeta, type BackendResult } from '@/lib/backend/client'
import { explorerTxUrl } from '@/lib/explorer'
import {
  adresseCourte,
  dateLisible,
  libelleMouvement,
  montantUsdc,
} from '@/lib/mouvements'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Opérations' }
export const dynamic = 'force-dynamic'

type MouvementIndexe = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber: string
  readonly txHash: string
  readonly investorAddress: string | null
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type ReponseEvenements = {
  readonly events?: {
    readonly status: string
    readonly value: readonly MouvementIndexe[] | null
    readonly reason?: string | null
  }
}

type RebalancingData = Record<string, unknown>

type Runtime = { readonly chainId?: number }

function barresParType(mouvements: readonly MouvementIndexe[] | null) {
  const parType = new Map<string, number>()
  if (!mouvements) return []
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const deja = parType.get(nom)
    parType.set(nom, deja === undefined ? 1 : deja + 1)
  }
  return [...parType.entries()].map(([nom, valeur]) => ({ nom, valeur }))
}

function cellType(m: MouvementIndexe) {
  return <span className="text-brand-foreground">{libelleMouvement(m.eventName)}</span>
}

function cellMontant(m: MouvementIndexe) {
  return (
    <span className="font-semibold text-brand-accent tabular-nums">
      {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic) : '—'}
    </span>
  )
}

function cellAdresse(m: MouvementIndexe) {
  return adresseCourte(m.investorAddress) ?? '—'
}

function cellBloc(m: MouvementIndexe) {
  return m.blockNumber
}

function cellDate(m: MouvementIndexe) {
  return <span className="text-brand-muted">{dateLisible(m.occurredAt)}</span>
}

function renderTxHash(chainId: number | undefined, txHash: string) {
  const url = explorerTxUrl(chainId, txHash)
  const court = adresseCourte(txHash)
  if (!court) return '—'
  if (!url) return court
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">
      {court}
    </a>
  )
}

function colonnesMouvements(chainId: number | undefined): readonly AdminTableColumn<MouvementIndexe>[] {
  return [
    { key: 'type', header: 'Type', cell: cellType },
    { key: 'montant', header: 'Montant', cell: cellMontant },
    { key: 'adresse', header: 'Investisseur', mono: true, cell: cellAdresse },
    { key: 'bloc', header: 'Bloc', mono: true, cell: cellBloc },
    {
      key: 'hash',
      header: 'Transaction',
      mono: true,
      cell: (m) => renderTxHash(chainId, m.txHash),
    },
    { key: 'date', header: 'Date', cell: cellDate },
  ]
}

function detailRegistreVide(reason: string | null | undefined): string {
  if (reason === 'no_events_indexed') {
    return 'Le registre est consulté et vide — pas une panne.'
  }
  return 'Le registre ne renvoie aucun mouvement.'
}

function RegistreMouvements({
  reponse,
  mouvements,
  barres,
  chainId,
}: Readonly<{
  reponse: BackendResult<ReponseEvenements>
  mouvements: readonly MouvementIndexe[] | null
  barres: readonly { nom: string; valeur: number }[]
  chainId: number | undefined
}>) {
  if (!reponse.ok) {
    return <AdminErrorState state={reponse.state} />
  }

  if (!mouvements || mouvements.length === 0) {
    return (
      <AdminSourceAttendue
        quoi="Aucun mouvement enregistré"
        detail={detailRegistreVide(reponse.data.events?.reason)}
        requis={['Un premier mouvement relevé sur la chaîne']}
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <AdminSurface className="flex flex-col p-6 lg:col-span-1">
        <AdminSurfaceHeader title="Répartition par type" description={`${mouvements.length} mouvements`} />
        <DistributionBarChart barres={barres} />
      </AdminSurface>

      <AdminSurface className="lg:col-span-2">
        <AdminTable rows={mouvements} keyFn={(m) => m.id} columns={colonnesMouvements(chainId)} />
      </AdminSurface>
    </div>
  )
}

function SectionRebalancing({ rebalancing }: Readonly<{ rebalancing: BackendResult<RebalancingData> }>) {
  if (!rebalancing.ok) {
    return <AdminErrorState state={rebalancing.state} title="État du rééquilibrage non lisible" />
  }

  return (
    <AdminSurface className="px-5 py-4">
      <AdminStatus status={statusFromMeta(rebalancing.meta)} />
      {rebalancing.meta?.reason ? <p className="mt-2 text-xs text-brand-muted">{rebalancing.meta.reason}</p> : null}
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-brand-muted hover:text-brand-foreground">
          Réponse enveloppée
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto font-mono text-xs text-brand-muted">
          {JSON.stringify(rebalancing.data, null, 2)}
        </pre>
      </details>
      <Link href="/admin/keeper" className="mt-3 inline-block text-sm text-brand-accent hover:underline">
        Actions keeper (rééquilibrage) →
      </Link>
    </AdminSurface>
  )
}

export default async function Page() {
  const [reponse, rebalancing, runtime] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<RebalancingData>('rebalancing-status'),
    callBackend<Runtime>('runtime'),
  ])

  const chainId = runtime.ok ? runtime.data.chainId : undefined
  const mouvements = reponse.ok ? (reponse.data.events?.value ?? null) : null
  const barres = barresParType(mouvements)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opérations"
        description="Validations en attente, rééquilibrage et registre des mouvements on-chain."
        endpointIds={['series1-events', 'rebalancing-status', 'runtime']}
      />

      <AdminSection title="En attente de validation" description="Approbations financières — source en attente">
        <AdminSourceAttendue
          quoi="Aucune file de validation ouverte"
          detail="DistributionApproval, VaultDeploymentApproval et ProposalSignature existent en base mais ne sont pas encore exposées en HTTP."
          requis={[
            'Lecture des demandes en attente et signatures reçues',
            'Geste d’approbation/rejet avec journalisation',
            'Contrôle conformité rattaché à chaque demande',
          ]}
        />
      </AdminSection>

      <AdminSection title="Rééquilibrage" description="État admin · GET /api/v1/rebalancing/status">
        <SectionRebalancing rebalancing={rebalancing} />
      </AdminSection>

      <AdminSection title="Registre des mouvements" description="Événements indexés Series 1">
        <div className="flex items-center gap-2">
          {reponse.ok && reponse.data.events ? (
            <AdminStatus status={reponse.data.events.status as never} />
          ) : null}
        </div>
        <RegistreMouvements reponse={reponse} mouvements={mouvements} barres={barres} chainId={chainId} />
      </AdminSection>
    </div>
  )
}
