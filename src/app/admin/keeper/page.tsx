import { PageHeader } from '@/components/admin/page-header'
import { requireSession } from '@/lib/auth'
import { toBackendRole } from '@/lib/backend/auth'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import type { Metadata } from 'next'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Keeper' }
export const dynamic = 'force-dynamic'

export default async function KeeperPage() {
  const session = await requireSession()
  const keeperEndpoints = endpointsByCategory('keeper')

  // Prérequis connus AVANT tout appel : sans eux les actions restent inertes.
  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())
  // Le jeton porteur vient du backend et vit dans le cookie de session.
  // `requireSession` a déjà écarté toute session expirée : arrivé ici, le jeton
  // est valide — on ne réévalue pas l'horloge pendant le rendu.

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Le rôle ${session.role} n’ouvre pas droit aux actions Keeper.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL n’est pas défini : aucune requête ne peut être émise.'
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        title="Keeper"
        description="Actions d’administration du backend. Rien ne part sans confirmation explicite, aucune réussite n’est supposée, et la réponse du backend est rendue telle quelle."
        endpointIds={keeperEndpoints.map((endpoint) => endpoint.id)}
      />

      <section className="border-hairline border bg-zinc-50 p-6 sm:p-8">
        <p className="text-xs tracking-[0.14em] text-zinc-600 uppercase">Périmètre opérationnel</p>
        <h2 className="mt-3 max-w-3xl text-2xl font-normal tracking-tight text-zinc-950">
          Aucune de ces routes ne signe de transaction
        </h2>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-zinc-700">
          Le backend ne dispose d’aucun helper d’écriture on-chain : ces routes enregistrent une demande, elles ne
          produisent ni signature ni hash de transaction. Trois d’entre elles répondent aujourd’hui un HTTP 501 avec un
          KeeperActionResult. Cette console n’affichera jamais de hash fabriqué.
        </p>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-600">
          Deux verrous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le
          coupe-circuit KEEPER_ENABLED — désactivé par défaut, il répond 503 NOT_CONFIGURED.
        </p>
      </section>

      {disabledReason ? (
        <p className="border-hairline border bg-white px-5 py-4 text-sm text-zinc-700">
          Actions inertes : {disabledReason}
        </p>
      ) : null}

      <div className="space-y-4">
        {keeperEndpoints.map((endpoint) => (
          <KeeperForm
            key={endpoint.id}
            endpoint={endpoint}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
          />
        ))}
      </div>
    </div>
  )
}
