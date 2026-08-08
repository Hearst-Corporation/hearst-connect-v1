import { ConsoleShell, csl } from '@/components/layout/console-shell'
import { Panel, PanelHeader } from '@/components/compositions'
import { AppRail } from '@/components/layout/app-rail'
import { Reading } from '@/components/layout/console'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { formatCurrency } from '@/lib/format'
import { publicUser } from '@/lib/session'
import { editorial, mapAvailability, unavailable } from '@/lib/vaults/model'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Home' }
export const dynamic = 'force-dynamic'

/**
 * Cockpit — USER surface (owner space home).
 *
 * Calm overview: a few real reference points (cumulative bitcoin, reserve,
 * data coverage) and access to sections. Session-tier endpoints only (`btc`,
 * `dashboard`), read honestly via `availabilityFromResolu`. No invented values,
 * no dated data presented as "Live".
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type Production = { readonly cumulativeBtcEarned?: string | null }
type Btc = {
  readonly reserve?: Resolu<{ balanceUsdc: string | null; balanceBtc: string | null }>
  readonly production?: Resolu<Production>
}

type ResolvedField = { readonly status: string; readonly value: unknown }
const isResolvedField = (v: unknown): v is ResolvedField =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

const SECTIONS: readonly { href: string; titre: string; detail: string }[] = [
  { href: '/account/dashboard', titre: 'Dashboard', detail: 'Your data coverage, surface by surface.' },
  { href: '/account/bitcoin', titre: 'Bitcoin production', detail: 'What the fund has produced and where the capital sits.' },
  { href: '/account/activity', titre: 'Activity', detail: 'The movement journal, newest to oldest.' },
  { href: '/account/profile', titre: 'Profile', detail: 'Your account and investor file.' },
]

export default async function Page() {
  const [session, btcRes, dashRes] = await Promise.all([
    requireSession(),
    callBackend<Btc>('btc'),
    callBackend<Record<string, unknown>>('dashboard'),
  ])
  const user = publicUser(session)
  const b = btcRes.ok ? btcRes.data : null

  const cumulCell = mapAvailability(
    availabilityFromResolu(b?.production, '/api/v1/btc'),
    (prod) => prod.cumulativeBtcEarned ?? '—',
  )
  const reserveCell = mapAvailability(
    availabilityFromResolu(b?.reserve, '/api/v1/btc'),
    (r) => formatCurrency(r.balanceUsdc, { decimals: 0 }),
  )

  const agg = dashRes.ok ? dashRes.data : null
  let servedN = 0
  let totalN = 0
  if (agg !== null) {
    for (const v of Object.values(agg)) {
      if (isResolvedField(v)) {
        totalN += 1
        if (v.status === 'LIVE') servedN += 1
      }
    }
  }
  const couvertureCell = mapAvailability(
    availabilityFromResolu(
      dashRes.ok && agg !== null
        ? { status: dashRes.meta?.status ?? 'LIVE', value: agg, reason: dashRes.meta?.reason ?? null }
        : null,
      '/api/v1/dashboard',
    ),
    () => (totalN === 0 ? '—' : `${Math.round((servedN / totalN) * 100)}%`),
  )

  return (
    <ConsoleShell
      label="Home — Hearst Connect Account"
      rail={<AppRail currentHref="/account" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Account reference points">
        <Panel tone="plain" className={csl.metricCard}><h2>Welcome</h2><div className={csl.metricText}><Reading value={editorial(user.name)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Cumulative Bitcoin</h2><div className={csl.metricText}><Reading value={cumulCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Idle reserve</h2><div className={csl.metricText}><Reading value={reserveCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Coverage</h2><div className={csl.metricText}><Reading value={couvertureCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Sources</h2><div className={csl.metricText}><Reading value={editorial(btcRes.ok && dashRes.ok ? 'Reachable' : 'Partial')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Your <span>account</span></p>
          <p className={csl.decisionMeta}>{btcRes.ok ? 'Production readable' : 'Production unavailable'}</p>
          <p className={csl.decisionActionMuted}>Nothing shown that is not measured</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Section access">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Welcome to your account</h2></div>
          <div className={csl.heroBody}>
            <p className="mb-6 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
              Your account brings together what the fund produces and what happens there. Every value shown is
              measured by the service: a missing datum is named as such, never replaced with a zero.
            </p>
            <AdminGrid>
              {SECTIONS.map((section) => (
                <AdminCol key={section.href} span={6}>
                  <Link href={section.href} className="block h-full">
                    <Panel tone="plain" className="flex h-full flex-col gap-1 p-6 transition-colors hover:bg-console-card-top">
                      <span className="text-base font-medium text-zinc-950 dark:text-white">{section.titre}</span>
                      <span className="text-sm/6 text-zinc-500 dark:text-zinc-400">{section.detail}</span>
                      <span className="mt-2 text-sm text-accent-600 dark:text-accent-300">Open →</span>
                    </Panel>
                  </Link>
                </AdminCol>
              ))}
            </AdminGrid>
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Bitcoin production</h3><p className={csl.cellText}>{btcRes.ok ? 'Readable' : 'Unavailable'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Data coverage</h3><p className={csl.cellText}>{dashRes.ok ? 'Reachable' : 'Unavailable'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Your role</h3><p className={csl.cellText}>{user.role}</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Account reference points">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>What you see</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Every reference point comes from a real service, read at display time.</p>
            <p className={csl.cellText}>A dated source is never presented as live.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Dashboard</h3><p className={csl.cellText}>Your data coverage.</p></article>
          <article className={csl.infoCell}><h3>Bitcoin production</h3><p className={csl.cellText}>What the fund has produced.</p></article>
          <article className={csl.infoCell}><h3>Activity</h3><p className={csl.cellText}>The movement journal.</p></article>
          <article className={csl.infoCell}><h3>Profile</h3><p className={csl.cellText}>Account and investor file.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Veracity</h3>
          <p className={csl.cellText}>No value is invented: an absence remains a named absence.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
