import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/truthful'
import { BACKEND_ENDPOINTS } from '@/lib/backend/endpoints'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Vue d’ensemble' }
export const dynamic = 'force-dynamic'

/**
 * Compte des endpoints par catégorie — lu du registre, jamais codé en dur.
 *
 * Compté par filtrage plutôt que par accumulateur : ces nombres décrivent le
 * registre lui-même, pas une donnée backend, et l'écrire sans `?? 0` évite
 * d'avoir à excuser une coalescence dans le gate de véracité.
 */
function registryCounts() {
  return {
    probe: BACKEND_ENDPOINTS.filter((e) => e.category === 'probe').length,
    business: BACKEND_ENDPOINTS.filter((e) => e.category === 'business').length,
    aiContext: BACKEND_ENDPOINTS.filter((e) => e.category === 'ai-context').length,
    keeper: BACKEND_ENDPOINTS.filter((e) => e.category === 'keeper').length,
  }
}

export default function AdminOverviewPage() {
  const counts = registryCounts()
  const configured = Boolean(process.env.CONNECT_BACKEND_URL?.trim())
  const signingConfigured = Boolean(process.env.SESSION_SIGNING_KEY?.trim())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue d’ensemble"
        description="État opérationnel du backend Hearst Connect et couverture du registre d’endpoints. Toute valeur affichée provient du backend ; rien n’est calculé ici."
        endpointIds={['health', 'ready', 'runtime']}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-cockpit-card p-4">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Endpoints au registre</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{BACKEND_ENDPOINTS.length}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {counts.probe} sondes · {counts.business} métier · {counts.aiContext} IA · {counts.keeper} keeper
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-cockpit-card p-4">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">URL backend</p>
          <div className="mt-2">
            <StatusBadge status={configured ? 'LIVE' : 'NOT_CONFIGURED'} />
          </div>
          <p className="mt-2 font-mono text-xs break-all text-zinc-500">
            {configured ? 'CONNECT_BACKEND_URL défini' : 'CONNECT_BACKEND_URL absent'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-cockpit-card p-4">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Signature de jeton</p>
          <div className="mt-2">
            <StatusBadge status={signingConfigured ? 'LIVE' : 'NOT_CONFIGURED'} />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {signingConfigured
              ? 'SESSION_SIGNING_KEY présente — les routes authentifiées sont appelables.'
              : 'SESSION_SIGNING_KEY absente : les routes authentifiées répondront « non configuré ».'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-cockpit-card p-4">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Explorer</p>
          <p className="mt-2 text-sm text-zinc-300">Chaque route du registre est appelable individuellement.</p>
          <Link
            href="/admin/api-explorer"
            className="mt-2 inline-block text-sm font-medium text-hearst-accent hover:text-hearst-accent-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hearst-accent"
          >
            Ouvrir l’API Explorer →
          </Link>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointSection endpointId="health" title="Vivacité du service" />
        <EndpointSection endpointId="ready" title="Disponibilité, base comprise" />
      </div>
      <EndpointSection endpointId="runtime" title="Runtime : contrat, chaîne, indexeur" />
    </div>
  )
}
