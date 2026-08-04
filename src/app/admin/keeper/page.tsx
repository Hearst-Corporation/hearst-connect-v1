import { GreenCommandCenterShell, gcc } from '@/components/design-lab/green-command-center/green-command-center-shell'
import { GreenCommandRail } from '@/components/design-lab/green-command-center/green-command-rail'
import { Panel, Reading } from '@/components/design-lab/green-command-center/primitives'
import { AdminCol, AdminGrid } from '@/components/admin/grid'
import { AdminSection } from '@/components/admin/surfaces'
import { StatusBadge } from '@/components/admin/truthful'
import { AdminSurfaceTitle } from '@/components/admin/typography'
import { endpointsByCategory } from '@/lib/backend/endpoints'
import { backendUrl } from '@/lib/env'
import { toBackendRole } from '@/lib/backend/auth'
import { requireSession } from '@/lib/auth'
import { publicUser } from '@/lib/session'
import { editorial } from '@/lib/vaults/model'
import clsx from 'clsx'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { KeeperForm } from './keeper-form'

export const metadata: Metadata = { title: 'Actions Keeper' }
export const dynamic = 'force-dynamic'


function Card({ children, className = '' }: Readonly<{ children: ReactNode; className?: string }>) {
  return <Panel className={className === '' ? gcc.wavePanel : className}>{children}</Panel>
}

/**
 * Keeper Actions — the routes that ask the service to record something.
 *
 * Composition, and why it is this one:
 *
 * 1. The scope statement (8 columns) and the readiness panel (4) sit on one
 *    row because together they answer a single question: what can these
 *    routes do at all, and can *you* run them right now. Split across two
 *    stacked full-width bands they read as two unrelated announcements.
 *
 * 2. The scope statement no longer wears an amber wash. Orange means
 *    "something is wrong" in this console; "these routes sign nothing" is a
 *    permanent property of the API, not an incident. The `NOT_SUPPORTED`
 *    badge carries that fact, and amber stays available for the one line
 *    that genuinely reports a degraded state — the reason actions are inert.
 *
 * 3. The action forms occupy a declared two-up grid. A form with two number
 *    fields does not need 1280px, and six of them stacked full width read as
 *    six unrelated pages rather than one list of six routes.
 */

/**
 * One prerequisite, stated rather than implied.
 *
 * A disabled action must always say why it is disabled: the operator sees
 * the condition, the value the console actually observed, and whether it is
 * met — not just a greyed-out button.
 */
function Prerequisite({
  libelle,
  valeur,
  satisfait,
}: Readonly<{ libelle: string; valeur: string; satisfait: boolean }>) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{libelle}</dt>
      <dd
        className={clsx(
          'text-sm font-medium',
          satisfait ? 'text-zinc-950 dark:text-white' : 'text-warning-400',
        )}
      >
        {valeur}
      </dd>
    </div>
  )
}

export default async function KeeperPage() {
  const session = await requireSession()
  const user = publicUser(session)
  const keeperEndpoints = endpointsByCategory('keeper')

  // Prerequisites known BEFORE any call: without them the actions stay inert.
  const isAdmin = toBackendRole(session.role) === 'admin'
  const backendConfigured = Boolean(backendUrl())
  // The bearer token comes from the backend and lives in the session cookie.
  // `requireSession` has already discarded any expired session: by the time we
  // get here, the token is valid — we don't re-check the clock during render.

  let disabledReason: string | null = null
  if (!isAdmin) {
    disabledReason = `Le rôle ${session.role} ne donne pas accès aux actions Keeper.`
  } else if (!backendConfigured) {
    disabledReason = 'HEARST_API_URL n’est pas défini : aucune requête ne peut être émise.'
  }

  // An even count pairs up cleanly; anything else stays full width rather
  // than stranding one lone card on the left of an empty row.
  const actionSpan = keeperEndpoints.length % 2 === 0 ? (6 as const) : (12 as const)
  const actionMd = actionSpan === 12 ? (8 as const) : (4 as const)

  return (
    <GreenCommandCenterShell
      label="Poste de pilotage keeper Hearst Connect"
      rail={<GreenCommandRail currentHref="/admin/administration" userName={user.name} userRole={user.role} />}
    >
      <section className={gcc.metricsRow} aria-label="Résumé keeper">
        <Panel className={gcc.metricCard}><h2>Actions</h2><div className={gcc.metricText}><Reading value={editorial(String(keeperEndpoints.length))} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Rôle</h2><div className={gcc.metricText}><Reading value={editorial(session.role)} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>URL du backend</h2><div className={gcc.metricText}><Reading value={editorial(backendConfigured ? 'Configuré' : 'Non défini')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Autorisation</h2><div className={gcc.metricText}><Reading value={editorial(isAdmin ? 'Accès administrateur' : 'Restreint')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.metricCard}><h2>Keeper activé</h2><div className={gcc.metricText}><Reading value={editorial('Le disjoncteur du backend s’applique')} className={gcc.metricValue} /></div></Panel>
        <Panel className={gcc.decisionCardNeutral}>
          <p className={gcc.decisionTitle}>Actions <span>Keeper</span></p>
          <p className={gcc.decisionMeta}>{disabledReason ? 'Actions inertes' : 'Actions disponibles'}</p>
          <p className={gcc.decisionActionMuted}>Confirmation explicite requise</p>
        </Panel>
      </section>

      <section className={gcc.mainRow} aria-label="Périmètre et disponibilité keeper">
        <Panel className={gcc.heroChart}>
          <div className={gcc.heroHead}><h2 className={gcc.cardTitle}>Actions Keeper</h2></div>
          <div className={gcc.heroBody}>
      <AdminSection title="Périmètre" description="Ces routes journalisent une requête — elles ne signent rien">
        <AdminGrid>
          <AdminCol span={8}>
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusBadge status="NOT_SUPPORTED" />
                <AdminSurfaceTitle as="p">Aucune de ces routes ne signe une transaction</AdminSurfaceTitle>
              </div>
              <p className="mt-3 max-w-prose text-sm/6 text-zinc-600 dark:text-zinc-300">
                Le backend n’a aucun assistant d’écriture on-chain : ces routes journalisent une requête, elles ne
                produisent ni signature ni hash de transaction. Trois d’entre elles renvoient actuellement un HTTP 501 avec un{' '}
                <span className="font-mono">KeeperActionResult</span>. Cette console n’affichera jamais un
                hash fabriqué.
              </p>
              <p className="mt-2 max-w-prose text-sm/6 text-zinc-500 dark:text-zinc-400">
                Deux garde-fous supplémentaires côté backend : un quota de 5 requêtes par minute et par utilisateur, et le disjoncteur{' '}
                <span className="font-mono">KEEPER_ENABLED</span> — désactivé par défaut, il
                renvoie 503 <span className="font-mono">NOT_CONFIGURED</span>.
              </p>
            </Card>
          </AdminCol>

          <AdminCol span={4} as="aside">
            <Card className="p-5">
              <AdminSurfaceTitle as="p">Peuvent-elles s’exécuter maintenant ?</AdminSurfaceTitle>
              <dl className="mt-4 space-y-3">
                <Prerequisite
                  libelle="Votre rôle"
                  valeur={session.role}
                  satisfait={isAdmin}
                />
                <Prerequisite
                  libelle="Adresse du service"
                  valeur={backendConfigured ? 'Configuré' : 'Non défini'}
                  satisfait={backendConfigured}
                />
              </dl>
              {disabledReason ? (
                <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs leading-relaxed text-warning-400 dark:border-console-line">
                  Actions inertes : {disabledReason}
                </p>
              ) : (
                <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs leading-relaxed text-zinc-500 dark:border-console-line dark:text-zinc-400">
                  Les deux prérequis sont satisfaits. Le service peut tout de même refuser un appel — son disjoncteur et son
                  quota sont vérifiés de son côté, et sa réponse est affichée sous l’action qui l’a déclenché.
                </p>
              )}
            </Card>
          </AdminCol>
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <aside className={gcc.rightStack}>
          <Panel className={gcc.signalCard}><h3>Contrôle du rôle</h3><p className={gcc.cellText}>{isAdmin ? 'Satisfait' : 'Non satisfait'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Adresse du service</h3><p className={gcc.cellText}>{backendConfigured ? 'Configuré' : 'Manquant'}</p></Panel>
          <Panel className={gcc.signalCard}><h3>Raison de désactivation</h3><p className={gcc.cellText}>{disabledReason ?? 'Aucune'}</p></Panel>
        </aside>
      </section>

      <section className={gcc.bottomRow} aria-label="Formulaires keeper">
        <Panel className={gcc.wavePanel}>
          <div className={gcc.heroHead}><h3 className={gcc.cardTitle}>Actions</h3></div>
          <div className={gcc.heroBody}>
      <AdminSection
        title="Actions"
        description={`${keeperEndpoints.length} routes exposées par le service. Rien ne quitte cette page tant que le mot CONFIRM n’a pas été saisi dans le champ propre à l’action.`}
      >
        <AdminGrid>
          {keeperEndpoints.map((endpoint) => (
            <AdminCol key={endpoint.id} span={actionSpan} md={actionMd}>
              <KeeperForm
                endpoint={endpoint}
                disabled={Boolean(disabledReason)}
                disabledReason={disabledReason}
              />
            </AdminCol>
          ))}
        </AdminGrid>
      </AdminSection>
          </div>
        </Panel>
        <Panel as="section" className={gcc.infoGrid}>
          <article className={gcc.infoCell}><h3>Confirmation</h3><p className={gcc.cellText}>Chaque formulaire exige la saisie de `CONFIRM`.</p></article>
          <article className={gcc.infoCell}><h3>Aucune signature</h3><p className={gcc.cellText}>Les requêtes ne génèrent aucune signature on-chain.</p></article>
          <article className={gcc.infoCell}><h3>Quota</h3><p className={gcc.cellText}>Le backend applique des limites de débit des requêtes.</p></article>
          <article className={gcc.infoCell}><h3>Résultat</h3><p className={gcc.cellText}>La réponse du backend est rendue telle quelle.</p></article>
        </Panel>
        <Panel className={gcc.vaultCard}>
          <h3 className={gcc.cardTitle}>Note opérationnelle</h3>
          <p className={gcc.cellText}>N’utilisez Keeper que pour des requêtes d’écriture intentionnelles vers le backend.</p>
        </Panel>
      </section>
    </GreenCommandCenterShell>
  )
}
