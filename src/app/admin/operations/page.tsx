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
} from '@/components/admin/surfaces'
import { callBackend, statusFromMeta } from '@/lib/backend/client'
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

export default async function Page() {
  const [reponse, rebalancing, runtime] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<RebalancingData>('rebalancing-status'),
    callBackend<Runtime>('runtime'),
  ])

  const chainId = runtime.ok ? runtime.data.chainId : undefined
  const mouvements = reponse.ok ? reponse.data.events?.value : null

  const parType = new Map<string, number>()
  if (mouvements) {
    for (const m of mouvements) {
      const nom = libelleMouvement(m.eventName)
      const deja = parType.get(nom)
      parType.set(nom, deja === undefined ? 1 : deja + 1)
    }
  }
  const barres = [...parType.entries()].map(([nom, valeur]) => ({ nom, valeur }))

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
        {!rebalancing.ok ? (
          <AdminErrorState state={rebalancing.state} title="État du rééquilibrage non lisible" />
        ) : (
          <AdminSurface className="px-5 py-4">
            <AdminStatus status={statusFromMeta(rebalancing.meta)} />
            {rebalancing.meta?.reason ? (
              <p className="mt-2 text-xs text-brand-muted">{rebalancing.meta.reason}</p>
            ) : null}
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
        )}
      </AdminSection>

      <AdminSection title="Registre des mouvements" description="Événements indexés Series 1">
        <div className="flex items-center gap-2">
          {reponse.ok && reponse.data.events ? (
            <AdminStatus status={reponse.data.events.status as never} />
          ) : null}
        </div>

        {!reponse.ok ? (
          <AdminErrorState state={reponse.state} />
        ) : !mouvements || mouvements.length === 0 ? (
          <AdminSourceAttendue
            quoi="Aucun mouvement enregistré"
            detail={
              reponse.data.events?.reason === 'no_events_indexed'
                ? 'Le registre est consulté et vide — pas une panne.'
                : 'Le registre ne renvoie aucun mouvement.'
            }
            requis={['Un premier mouvement relevé sur la chaîne']}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <AdminSurface className="lg:col-span-1">
              <AdminSurfaceHeader
                title="Répartition par type"
                description={`${mouvements.length} mouvements`}
              />
              <DistributionBarChart barres={barres} />
            </AdminSurface>

            <AdminSurface className="lg:col-span-2">
              <AdminTable
                rows={mouvements}
                keyFn={(m) => m.id}
                columns={[
                  {
                    key: 'type',
                    header: 'Type',
                    cell: (m) => <span className="text-brand-foreground">{libelleMouvement(m.eventName)}</span>,
                  },
                  {
                    key: 'montant',
                    header: 'Montant',
                    cell: (m) => (
                      <span className="font-semibold text-brand-accent tabular-nums">
                        {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic) : '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'adresse',
                    header: 'Investisseur',
                    mono: true,
                    cell: (m) => adresseCourte(m.investorAddress) ?? '—',
                  },
                  {
                    key: 'bloc',
                    header: 'Bloc',
                    mono: true,
                    cell: (m) => m.blockNumber,
                  },
                  {
                    key: 'hash',
                    header: 'Transaction',
                    mono: true,
                    cell: (m) => {
                      const url = explorerTxUrl(chainId, m.txHash)
                      const court = adresseCourte(m.txHash)
                      if (!court) return '—'
                      return url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-accent hover:underline"
                        >
                          {court}
                        </a>
                      ) : (
                        court
                      )
                    },
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    cell: (m) => <span className="text-brand-muted">{dateLisible(m.occurredAt)}</span>,
                  },
                ]}
              />
            </AdminSurface>
          </div>
        )}
      </AdminSection>
    </div>
  )
}
