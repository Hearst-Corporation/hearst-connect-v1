import { CockpitSection } from '@/components/admin/cockpit-section'
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
    <div className="space-y-8">
      <PageHeader
        title="Keeper"
        description="Actions d’administration du backend. Rien ne part sans confirmation explicite, aucune réussite n’est supposée, et la réponse du backend est rendue telle quelle."
      />

      <CockpitSection title="Périmètre" description="Ces routes enregistrent une demande — elles ne signent rien">
        <div className="rounded-xl bg-amber-500/5 p-5 ring-1 ring-amber-500/30 sm:p-6 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <StatusBadge status="NOT_SUPPORTED" />
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
              Aucune de ces routes ne signe de transaction
            </h2>
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Le backend ne dispose d’aucun helper d’écriture on-chain : ces routes enregistrent une demande, elles ne
            produisent ni signature ni hash de transaction. Trois d’entre elles répondent aujourd’hui un HTTP 501 avec
            un <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais de hash fabriqué.
          </p>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Deux verrous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le
            coupe-circuit <span className="font-mono">KEEPER_ENABLED</span> — désactivé par défaut, il répond 503{' '}
            <span className="font-mono">NOT_CONFIGURED</span>.
          </p>
        </div>
        {disabledReason ? (
          <p className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-600 ring-1 ring-zinc-950/5 dark:bg-zinc-950/50 dark:text-zinc-300 dark:ring-white/5">
            Actions inertes : {disabledReason}
          </p>
        ) : null}
      </CockpitSection>

      <CockpitSection title="Actions" description="Confirmation explicite requise avant tout appel">
        {keeperEndpoints.map((endpoint) => (
          <KeeperForm
            key={endpoint.id}
            endpoint={endpoint}
            disabled={Boolean(disabledReason)}
            disabledReason={disabledReason}
          />
        ))}
      </CockpitSection>
    </div>
  )
}
