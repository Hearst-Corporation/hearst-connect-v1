import { DashboardHeader } from '@/components/admin/dashboard'
import type { AdminHeroKpi } from '@/components/admin/hero-kpi'
import { DashCard, PanelHeaderLink } from '@/components/admin/dashboard'
import { BentoCard, BentoGrid } from '@/components/admin/grid'
import { Callout } from '@/components/compositions'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { toBackendRole } from '@/lib/backend/auth'
import { KEEPER_RATE_LIMIT_PER_MINUTE } from '@/lib/backend/constants'
import { requireSession } from '@/lib/auth'
import { backendUrl } from '@/lib/env'
import { formatNumber } from '@/lib/format'
import { roleLabel } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import {
  CheckCircleIcon,
  CommandLineIcon,
  ServerIcon,
  UserIcon,
} from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { KeeperForm } from '@/components/admin/keeper-form'
import { ReportFleetMetrics } from './report-fleet-metrics'
import { IndexerTriggerForm } from './indexer-trigger-form'

export const metadata: Metadata = { title: 'Keeper' }
export const dynamic = 'force-dynamic'

/** Les routes Keeper dont le geste a déjà son écran dans le produit : on y mène, on ne double pas. */
const DONE_IN_PRODUCT: Record<string, { label: string; href: string }> = {
  'mining-distribution-approve': { label: 'Dashboard · Waiting on you', href: '/admin#distribution' },
  'keeper-electricity-pay': { label: 'Settlement', href: '/admin/settlement' },
  'keeper-rebalancing-execute': { label: 'Client page · rebalancing', href: '/admin/clients/active' },
}
/** Déclarée à part, avec son propre formulaire (les métriques du parc). */
const OWN_FORM = new Set(['keeper-mining-report'])
/** Une route que le backend annonce en 501 : pas de bouton qui échouera à coup sûr. */
const notImplemented = (caveat?: string | null) => (caveat ?? '').includes('501')

/**
 * Keeper — les gestes techniques, et eux seuls.
 *
 *   Run              ce qu'on déclenche vraiment d'ici : l'indexeur, la
 *                    déclaration du parc, le calcul de rendement d'une période.
 *   Done in product  les routes dont le geste a son écran métier (Settlement,
 *                    décisions, fiche client) : un lien, pas un doublon.
 *   Not implemented  ce que le backend annonce en 501 : nommé, sans bouton.
 *
 * Aucune de ces routes ne signe : elles consignent une requête. Les mouvements
 * d'argent passent par Fireblocks, depuis les écrans métier.
 */
export default async function KeeperPage() {
  const session = await requireSession()
  const keeperEndpoints = endpointsByCategory('keeper')

  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Role ${roleLabel(session.role)} does not grant access to Keeper actions.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL is not set — no request can be sent.'
  }

  const actionsDisponibles = disabledReason === null

  const kpis: readonly AdminHeroKpi[] = [
    {
      id: 'actions',
      title: 'Exposed actions',
      value: editorial(formatNumber(keeperEndpoints.length)),
      icon: CommandLineIcon,
    },
    {
      id: 'role',
      title: 'Role',
      value: editorial(roleLabel(session.role)),
      icon: UserIcon,
    },
    {
      id: 'service',
      title: 'Service address',
      value: editorial(backendConfigured ? 'Configured' : 'Not set'),
      icon: ServerIcon,
    },
    {
      id: 'disponibilite',
      title: 'Availability',
      value: editorial(actionsDisponibles ? 'Actions available' : 'Actions inactive'),
      icon: CheckCircleIcon,
    },
  ]

  const runnable = keeperEndpoints.filter(
    (e) => !OWN_FORM.has(e.id) && !(e.id in DONE_IN_PRODUCT) && !notImplemented(e.caveat),
  )
  const inProduct = keeperEndpoints.filter((e) => e.id in DONE_IN_PRODUCT)
  const pending = keeperEndpoints.filter((e) => notImplemented(e.caveat))

  return (
    <div className="flex w-full min-w-0 flex-col gap-6">
      <DashboardHeader
        title="Keeper"
        description="Technical requests to the backend — they log a request and sign nothing. Money moves through Fireblocks, from the product screens."
        kpis={kpis}
      />

      {disabledReason ? (
        <Callout tone="warning" title="Actions are inactive">
          {disabledReason}
        </Callout>
      ) : null}

      {/* RUN — la déclaration du parc en bande pleine, puis les gestes
          ponctuels par paires, à la même hauteur. */}
      <BentoGrid>
        <BentoCard span={12} bare>
          <ReportFleetMetrics />
        </BentoCard>
      </BentoGrid>

      <BentoGrid>
        <BentoCard span={6} bare>
          <DashCard
            title="Indexer trigger"
            subtitle="Starts one indexer pass — ineffective while chain RPC is down"
            action={<PanelHeaderLink href="/admin/settings/developer/service">Service</PanelHeaderLink>}
          >
            <IndexerTriggerForm />
          </DashCard>
        </BentoCard>
        {runnable.map((endpoint) => (
          <BentoCard key={endpoint.id} span={6} bare>
            <KeeperForm endpoint={endpoint} disabled={Boolean(disabledReason)} disabledReason={disabledReason} />
          </BentoCard>
        ))}
      </BentoGrid>

      {/* Ce qui ne se fait PAS d'ici : le produit a l'écran, ou le backend pas encore la route. */}
      <BentoGrid>
        <BentoCard span={6} bare>
          <DashCard title="Done from the product" subtitle="These routes have a business screen — use it, with its checks and its trace.">
            <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
              {inProduct.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{e.summary}</span>
                    <span className="block truncate font-mono text-[11px] text-fg-tertiary">
                      {e.method} {e.path}
                    </span>
                  </span>
                  <PanelHeaderLink href={DONE_IN_PRODUCT[e.id].href}>{DONE_IN_PRODUCT[e.id].label}</PanelHeaderLink>
                </li>
              ))}
            </ul>
          </DashCard>
        </BentoCard>
        <BentoCard span={6} bare>
          <DashCard title="Not implemented by the backend yet" subtitle="Announced as HTTP 501 — no button that would fail for sure.">
            <ul className="flex flex-col divide-y divide-[var(--ud-line)]">
              {pending.map((e) => (
                <li key={e.id} className="flex flex-col py-2.5 first:pt-0 last:pb-0">
                  <span className="truncate text-sm text-fg">{e.summary}</span>
                  <span className="truncate font-mono text-[11px] text-fg-tertiary">
                    {e.method} {e.path}
                  </span>
                </li>
              ))}
            </ul>
          </DashCard>
        </BentoCard>
      </BentoGrid>

      <p className="text-xs text-fg-tertiary">
        Backend safeguards: {KEEPER_RATE_LIMIT_PER_MINUTE} requests per minute per user, and the circuit breaker{' '}
        <span className="font-mono">KEEPER_ENABLED</span> (off by default — the service then answers 503).
      </p>
    </div>
  )
}
