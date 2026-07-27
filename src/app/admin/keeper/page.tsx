import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/truthful'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
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
    <div className="space-y-6">
      <PageHeader
        title="Keeper"
        description="Actions d’administration du backend. Rien ne part sans confirmation explicite, aucune réussite n’est supposée, et la réponse du backend est rendue telle quelle."
        endpointIds={keeperEndpoints.map((endpoint) => endpoint.id)}
      />

      <section className="rounded-xl border border-hearst-warn/30 bg-hearst-warn/5 p-4">
        <div className="flex items-center gap-2">
          <StatusBadge status="NOT_SUPPORTED" />
          <h2 className="text-sm font-semibold text-white">Aucune de ces routes ne signe de transaction</h2>
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Le backend ne dispose d’aucun helper d’écriture on-chain : ces routes enregistrent une demande, elles ne
          produisent ni signature ni hash de transaction. Trois d’entre elles répondent aujourd’hui un HTTP 501 avec
          un <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais de hash fabriqué.
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Deux verrous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le
          coupe-circuit <span className="font-mono">KEEPER_ENABLED</span> — désactivé par défaut, il répond
          503 <span className="font-mono">NOT_CONFIGURED</span>.
        </p>
      </section>

      {disabledReason ? (
        <p className="rounded-lg border border-white/10 bg-cockpit-inset px-4 py-3 text-sm text-zinc-300">
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
