import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge } from '@/components/admin/truthful'
import { BACKEND_ENDPOINTS } from '@/lib/backend/endpoints'
import { requireSession } from '@/lib/auth'
import { announceConfigurationOnce, checkConfiguration } from '@/lib/env'
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

export default async function AdminOverviewPage() {
  const counts = registryCounts()

  // Le layout garantit déjà une session ; on la relit ici pour décrire son état
  // réel (échéance du jeton backend), sans jamais l'afficher lui-même.
  const session = await requireSession()

  // Validation au démarrage : signale une seule fois les variables manquantes,
  // par leur NOM. Aucune valeur n'est journalisée.
  announceConfigurationOnce()
  const config = checkConfiguration()
  const configured = config.publicReady
  const sessionExpiry = new Date(session.expiresAt * 1000)

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
            {configured ? 'HEARST_API_URL défini' : 'HEARST_API_URL absent'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-cockpit-card p-4">
          <p className="text-xs tracking-wide text-zinc-500 uppercase">Session backend</p>
          <div className="mt-2">
            <StatusBadge status="LIVE" />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Jeton émis par le backend, porté par le cookie serveur. Valide jusqu’au{' '}
            <span className="tabular-nums">{sessionExpiry.toISOString()}</span>.
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

      <section className="rounded-xl border border-white/10 bg-cockpit-card p-5">
        <h2 className="text-sm font-semibold text-white">Configuration serveur</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Noms et états uniquement — aucune valeur de secret n’est lue, affichée ni journalisée.
        </p>
        <dl className="mt-4 divide-y divide-white/5">
          {config.report.map((entry) => (
            <div key={entry.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <dt className="font-mono text-xs text-zinc-300">{entry.name}</dt>
              <dd>
                <StatusBadge status={entry.status === 'ok' ? 'LIVE' : 'NOT_CONFIGURED'} />
              </dd>
              <dd className="text-xs text-zinc-500">{entry.detail ?? entry.purpose}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <EndpointSection endpointId="health" title="Vivacité du service" />
        <EndpointSection endpointId="ready" title="Disponibilité, base comprise" />
      </div>
      <EndpointSection endpointId="runtime" title="Runtime : contrat, chaîne, indexeur" />
    </div>
  )
}
