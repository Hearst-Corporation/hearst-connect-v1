import { DashCard, DashboardHeader, DashboardShell } from '@/components/admin/dashboard'
import { FireblocksLogo, GmailLogo, HubSpotLogo, SumsubLogo } from '@/components/brand-logos'
import { Callout } from '@/components/compositions'
import type { BackendResolved } from '@/lib/admin-dashboard/cache'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { formatDateTime } from '@/lib/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integrations' }
export const dynamic = 'force-dynamic'

/**
 * LES INTÉGRATIONS — les services tiers dont le produit dépend, et leur santé.
 *
 *   Sumsub       KYC & AML : la décision arrive par webhook, jamais de la console.
 *   Fireblocks   garde et paiements : tout ce qui déplace de l'argent.
 *   HubSpot      CRM : chaque courriel du parcours y est consigné.
 *   Gmail        envoi : depuis la boîte de l'opérateur connecté.
 *   Price feed   le cours du bitcoin — chaque conversion en dépend.
 *   Mining pool  ce que le parc produit réellement.
 *
 * Le backend sonde chacun et publie ce qu'il voit ; les secrets ne quittent
 * jamais le backend. Une intégration illisible se dit illisible.
 */

type Integration = Readonly<{
  id: string
  name: string
  role: string
  status: 'connected' | 'degraded' | 'disconnected' | 'not_configured' | string
  environment: 'sandbox' | 'production' | string | null
  lastCallAt: string | null
  lastWebhookAt: string | null
  detail: string | null
}>

const LOGO: Record<string, (p: { className?: string }) => React.ReactNode> = {
  sumsub: SumsubLogo,
  fireblocks: FireblocksLogo,
  hubspot: HubSpotLogo,
  gmail: GmailLogo,
}

const TONE: Record<string, { label: string; tone: string }> = {
  connected: { label: 'Connected', tone: 'text-[var(--hearst-green)] ring-[var(--hearst-green)]/30' },
  degraded: { label: 'Degraded', tone: 'text-amber-300 ring-amber-300/30' },
  disconnected: { label: 'Disconnected', tone: 'text-red-400 ring-red-400/30' },
  not_configured: { label: 'Not configured', tone: 'text-fg-tertiary ring-[var(--ud-line)]' },
}

async function loadIntegrations(): Promise<readonly Integration[] | null> {
  try {
    const res = await callBackend<{ integrations: BackendResolved<readonly Integration[]> }>('admin-integrations')
    const value = res.ok ? res.data.integrations?.value : null
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

export default async function IntegrationsPage() {
  await requireSession()
  const integrations = await loadIntegrations()

  return (
    <DashboardShell>
      <DashboardHeader
        title="Integrations"
        description="The third parties the product runs on — KYC, custody and payments, CRM, sending, price, mining — and whether each one answers."
        kpis={[]}
      />

      <DashCard className="min-w-0" title="Connected services" subtitle="Probed by the backend — secrets never leave it">
        {integrations === null ? (
          <Callout tone="warning" title="Integrations could not be read">
            The backend does not publish their health yet — nothing is shown rather than a guess.
          </Callout>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-2">
            {integrations.map((i) => {
              const Logo = LOGO[i.id]
              const tone = TONE[i.status] ?? { label: i.status, tone: 'text-fg-secondary ring-[var(--ud-line)]' }
              return (
                <li key={i.id} className="flex flex-col gap-3 rounded-[var(--ud-radius-sm)] p-4 ring-1 ring-[var(--ud-line)]">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-fg">
                      {Logo ? <Logo className="size-5" /> : <span className="text-xs font-semibold">{i.name.slice(0, 2)}</span>}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-fg">{i.name}</span>
                      <span className="text-xs text-fg-tertiary">{i.role}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${tone.tone}`}>{tone.label}</span>
                  </div>
                  {i.detail ? <p className="text-xs text-fg-secondary">{i.detail}</p> : null}
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-fg-tertiary">Environment</dt>
                      <dd className="text-fg capitalize">{i.environment ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-tertiary">Last call</dt>
                      <dd className="text-fg">{i.lastCallAt ? formatDateTime(i.lastCallAt) : '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-fg-tertiary">Last webhook</dt>
                      <dd className="text-fg">{i.lastWebhookAt ? formatDateTime(i.lastWebhookAt) : '—'}</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        )}
      </DashCard>
    </DashboardShell>
  )
}
