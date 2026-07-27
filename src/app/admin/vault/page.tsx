import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { UnavailableState } from '@/components/admin/truthful'
import { callBackend } from '@/lib/backend/client'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Vault' }
export const dynamic = 'force-dynamic'

/**
 * Extrait les index de stratégie RÉELLEMENT présents dans la réponse backend.
 *
 * Aucun index n'est fabriqué : si la forme de la réponse ne porte pas d'index
 * exploitable, le sélecteur ne s'affiche pas. Mieux vaut pas de sélecteur qu'un
 * sélecteur qui propose des index inexistants.
 */
function extractIndexes(data: unknown): number[] {
  const list = Array.isArray(data)
    ? data
    : typeof data === 'object' && data !== null && Array.isArray((data as { strategies?: unknown[] }).strategies)
      ? (data as { strategies: unknown[] }).strategies
      : []

  return list
    .map((entry, position) => {
      if (typeof entry === 'object' && entry !== null && 'index' in entry) {
        const raw = (entry as { index: unknown }).index
        if (typeof raw === 'number' && Number.isInteger(raw)) return raw
        if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number.parseInt(raw, 10)
      }
      return Array.isArray(data) ? position : null
    })
    .filter((value): value is number => value !== null)
}

export default async function VaultPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ strategy?: string }> }>) {
  const params = await searchParams
  const strategies = await callBackend('vault-strategies')
  const indexes = strategies.ok ? extractIndexes(strategies.data) : []

  const requested = params.strategy ? Number.parseInt(params.strategy, 10) : null
  const selected = requested !== null && indexes.includes(requested) ? requested : (indexes[0] ?? null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault"
        description="État du vault, stratégies, RWA vault et rééquilibrage. Le détail de stratégie n’est interrogeable que sur les index réellement renvoyés par le backend."
        endpointIds={['vault', 'vault-strategies', 'strategy-detail', 'rwa-vault', 'rebalancing-status']}
      />

      <EndpointSection endpointId="vault" />
      <EndpointSection endpointId="vault-strategies" />

      <section className="rounded-xl border border-white/10 bg-cockpit-card p-5">
        <h2 className="text-sm font-semibold text-white">Détail d’une stratégie</h2>
        {indexes.length === 0 ? (
          <div className="mt-4">
            <UnavailableState
              state={
                strategies.ok
                  ? {
                      status: 'EMPTY',
                      value: null,
                      reason:
                        "La réponse `vault/strategies` ne porte aucun index exploitable : aucun détail n'est proposé plutôt qu'un index inventé.",
                      provenance: { route: '/api/v1/vault/strategies', field: null, fetchedAt: null, requestId: null },
                    }
                  : strategies.state
              }
            />
          </div>
        ) : (
          <>
            <nav className="mt-3 flex flex-wrap gap-2">
              {indexes.map((index) => (
                <Link
                  key={index}
                  href={`/admin/vault?strategy=${index}`}
                  aria-current={index === selected ? 'page' : undefined}
                  className={
                    index === selected
                      ? 'rounded border border-hearst-accent bg-hearst-accent/10 px-2.5 py-1 text-xs font-semibold text-hearst-accent'
                      : 'rounded border border-white/10 px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white'
                  }
                >
                  #{index}
                </Link>
              ))}
            </nav>
            {selected !== null ? (
              <div className="mt-4">
                <EndpointSection endpointId="strategy-detail" params={{ index: selected }} title={`Stratégie #${selected}`} />
              </div>
            ) : null}
          </>
        )}
      </section>

      <EndpointSection endpointId="rwa-vault" />
      <EndpointSection endpointId="rebalancing-status" />
    </div>
  )
}
