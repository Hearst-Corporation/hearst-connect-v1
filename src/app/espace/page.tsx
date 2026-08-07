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

export const metadata: Metadata = { title: 'Cockpit' }
export const dynamic = 'force-dynamic'

/**
 * Cockpit — surface USER (accueil de l'espace propriétaire).
 *
 * Vue d'ensemble calme : quelques repères réels (bitcoin cumulé, réserve,
 * couverture des données) et l'accès aux sections. Endpoints session-tier
 * uniquement (`btc`, `dashboard`), lus honnêtement via `availabilityFromResolu`.
 * Aucune valeur inventée, aucune donnée datée présentée « En direct ».
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
  { href: '/espace/dashboard', titre: 'Tableau de bord', detail: 'La couverture de vos données, surface par surface.' },
  { href: '/espace/bitcoin', titre: 'Production Bitcoin', detail: 'Ce que le fonds a produit et où se trouve l’argent.' },
  { href: '/espace/activite', titre: 'Activité', detail: 'Le journal des mouvements, du plus récent au plus ancien.' },
  { href: '/espace/profil', titre: 'Profil', detail: 'Votre compte et votre dossier investisseur.' },
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
      label="Cockpit — Espace Hearst Connect"
      rail={<AppRail currentHref="/espace" userName={user.name} userRole={user.role} />}
    >
      <section className={csl.metricsRow} aria-label="Repères de l’espace">
        <Panel tone="plain" className={csl.metricCard}><h2>Bienvenue</h2><div className={csl.metricText}><Reading value={editorial(user.name)} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Bitcoin cumulé</h2><div className={csl.metricText}><Reading value={cumulCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Réserve dormante</h2><div className={csl.metricText}><Reading value={reserveCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Couverture</h2><div className={csl.metricText}><Reading value={couvertureCell} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.metricCard}><h2>Sources</h2><div className={csl.metricText}><Reading value={editorial(btcRes.ok && dashRes.ok ? 'Joignables' : 'Partielles')} className={csl.metricValue} /></div></Panel>
        <Panel tone="plain" className={csl.decisionCardNeutral}>
          <p className={csl.decisionTitle}>Votre <span>espace</span></p>
          <p className={csl.decisionMeta}>{btcRes.ok ? 'Production lisible' : 'Production indisponible'}</p>
          <p className={csl.decisionActionMuted}>Rien n’est présenté qui ne soit mesuré</p>
        </Panel>
      </section>

      <section className={csl.mainRow} aria-label="Accès aux sections">
        <Panel tone="plain" className={csl.heroChart}>
          <div className={csl.heroHead}><h2 className={csl.cardTitle}>Bienvenue dans votre espace</h2></div>
          <div className={csl.heroBody}>
            <p className="mb-6 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
              Votre espace réunit ce que le fonds produit et ce qui s’y passe. Chaque valeur affichée est
              mesurée par le service : une donnée absente est nommée comme telle, jamais remplacée par un zéro.
            </p>
            <AdminGrid>
              {SECTIONS.map((section) => (
                <AdminCol key={section.href} span={6}>
                  <Link href={section.href} className="block h-full">
                    <Panel tone="plain" className="flex h-full flex-col gap-1 p-6 transition-colors hover:bg-console-card-top">
                      <span className="text-base font-medium text-zinc-950 dark:text-white">{section.titre}</span>
                      <span className="text-sm/6 text-zinc-500 dark:text-zinc-400">{section.detail}</span>
                      <span className="mt-2 text-sm text-accent-600 dark:text-accent-300">Ouvrir →</span>
                    </Panel>
                  </Link>
                </AdminCol>
              ))}
            </AdminGrid>
          </div>
        </Panel>
        <aside className={csl.rightStack}>
          <Panel tone="plain" className={csl.signalCard}><h3>Production bitcoin</h3><p className={csl.cellText}>{btcRes.ok ? 'Lisible' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Couverture des données</h3><p className={csl.cellText}>{dashRes.ok ? 'Joignable' : 'Indisponible'}</p></Panel>
          <Panel tone="plain" className={csl.signalCard}><h3>Votre rôle</h3><p className={csl.cellText}>{user.role}</p></Panel>
        </aside>
      </section>

      <section className={csl.bottomRow} aria-label="Repères de l’espace">
        <Panel tone="plain" className={csl.wavePanel}>
          <div className={csl.heroHead}><h3 className={csl.cardTitle}>Ce que vous voyez</h3></div>
          <div className={csl.heroBody}>
            <p className={csl.cellText}>Chaque repère provient d’un service réel, lu au moment de l’affichage.</p>
            <p className={csl.cellText}>Une source datée n’est jamais présentée comme étant en direct.</p>
          </div>
        </Panel>
        <Panel as="section" tone="plain" className={csl.infoGrid}>
          <article className={csl.infoCell}><h3>Tableau de bord</h3><p className={csl.cellText}>Couverture de vos données.</p></article>
          <article className={csl.infoCell}><h3>Production Bitcoin</h3><p className={csl.cellText}>Ce que le fonds a produit.</p></article>
          <article className={csl.infoCell}><h3>Activité</h3><p className={csl.cellText}>Le journal des mouvements.</p></article>
          <article className={csl.infoCell}><h3>Profil</h3><p className={csl.cellText}>Compte et dossier investisseur.</p></article>
        </Panel>
        <Panel tone="plain" className={csl.vaultCard}>
          <h3 className={csl.cardTitle}>Véracité</h3>
          <p className={csl.cellText}>Aucune valeur n’est inventée : une absence reste une absence nommée.</p>
        </Panel>
      </section>
    </ConsoleShell>
  )
}
