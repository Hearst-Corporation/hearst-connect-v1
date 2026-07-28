import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { AdminKpiSurface, type AdminKpiItem } from '@/components/admin/admin-kpi-surface'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { AccueilAlertes, type AlerteBackend } from '@/components/admin/charts/accueil-alertes'
import {
  AccueilDeriveChart,
  SEUIL_DERIVE_ATTENTION_BPS,
  SEUIL_DERIVE_CRITIQUE_BPS,
  type PocheDerive,
} from '@/components/admin/charts/accueil-derive-chart'
import { AccueilVueEnsemble, type VerdictAccueil } from '@/components/admin/charts/accueil-vue-ensemble'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { ExceptionBanner, CalmState } from '@/components/admin/cockpit'
import { DistributionBarChart, type BarreRepartition } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { PocketProgress, PocketProgressLegend } from '@/components/admin/pocket-progress'
import { ShortcutRow } from '@/components/admin/shortcut-row'
import { Panel, PanelHeading, surfaceRaised } from '@/components/admin/surface'
import { callBackend } from '@/lib/backend/client'
import { ilYA, libelleMouvement, montantUsdc, phraseMouvement } from '@/lib/mouvements'
import { etatSerieDe } from '@/lib/serie-etat'
import {
  ArrowsRightLeftIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  ServerStackIcon,
} from '@heroicons/react/20/solid'
import type { Metadata } from 'next'
import Link from 'next/link'
import clsx from 'clsx'

/**
 * Accueil — le poste de commande.
 *
 * L'écran répond à une seule question, dans cet ordre : « tout va bien, ou
 * pas ? », puis « où en est-on ? », puis « que s'est-il passé ? ».
 *
 * D'où la composition :
 *   1. les exceptions et les ALERTES d'abord — le service en émet, elles ne
 *      peuvent pas rester sous le pli ;
 *   2. la vue d'ensemble : encours, plafond consommé, et trois verdicts
 *      opérationnels (dérive, couverture électricité, disponibilité) ;
 *   3. les mesures détaillées, puis les graphiques qui les expliquent ;
 *   4. l'activité récente, et seulement à la fin les raccourcis.
 *
 * Deux partis pris qui rompent avec la version précédente, assumés :
 *
 * — Les graphiques passent de `CockpitFigure` à `ChartFrame`. Un cadre qui
 *   déclare l'unité, la provenance et l'ÉTAT de la série vaut mieux qu'une
 *   figure muette : quand la source manque, le cadre reste posé et dit
 *   pourquoi, au lieu de disparaître ou de tracer un zéro.
 *
 * — Le donut « Mix capacité » cède la place à la barre de plafond de la vue
 *   d'ensemble. Les deux représentaient le même nombre ; le second emplacement
 *   sert désormais à la DÉRIVE d'allocation, qui n'était affichée nulle part
 *   alors qu'elle est la seule mesure actionnable du bloc.
 *
 * Les seuils de lecture (dérive, couverture électricité) sont des conventions
 * de cette console : le contrat n'expose aucune tolérance. Ils sont annoncés
 * comme tels à l'écran, jamais présentés comme une règle du produit.
 */

export const metadata: Metadata = { title: 'Accueil' }
export const dynamic = 'force-dynamic'

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Poche = {
  readonly pocket: string
  readonly label?: string | null
  readonly targetBps: number
  readonly actualBps: number | null
  readonly driftBps?: number | null
}

type Dashboard = {
  readonly capacity?: Resolu<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
  readonly performance?: Resolu<{ navPerShare: string | null; totalReturnBps: number | null }>
  readonly strategies?: Resolu<readonly Poche[]>
  readonly allocation?: Resolu<{ pockets: readonly Poche[]; targetTotalBps?: number | null }>
  readonly alerts?: Resolu<readonly AlerteBackend[]>
  readonly rebalancing?: Resolu<{
    lastRebalanceAt: string | null
    driftBps: number | null
    pending: unknown
  }>
  readonly reserve?: Resolu<{
    reserveUsdc: string | null
    reserveBps: number | null
    electricityCoveredMonths: number | null
  }>
  readonly subscription?: Resolu<{
    subscriptionOpen: boolean | null
    minimumDepositAtomic: string | null
    whitelistRequired: boolean | null
  }>
}

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type Evenements = { readonly events?: Resolu<readonly Mouvement[]> }

/* ── Formatage ───────────────────────────────────────────────────────────── */

function pourcentage(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

/** Un écart se dit en POINTS, avec son signe : « −2,15 pt » se décide. */
function points(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  const valeur = bps / 100
  const signe = valeur > 0 ? '+' : ''
  return `${signe}${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`
}

/* ── Poches ──────────────────────────────────────────────────────────────── */

/**
 * `allocation.pockets` porte le libellé et la dérive déjà calculée par le
 * service ; `strategies` ne porte que la cible et le réel. On lit donc le
 * premier quand il répond, et on retombe sur le second sans rien inventer.
 */
function pochesLues(d: Dashboard | null): readonly Poche[] {
  const parAllocation = d?.allocation?.value?.pockets
  if (parAllocation !== undefined && parAllocation !== null && parAllocation.length > 0) return parAllocation
  const parStrategies = d?.strategies?.value
  if (parStrategies !== undefined && parStrategies !== null) return parStrategies
  return []
}

function libellePoche(p: Poche): string {
  return typeof p.label === 'string' && p.label !== '' ? p.label : p.pocket
}

function allocations(poches: readonly Poche[]): PocheAllocation[] {
  return poches.map((p) => ({
    poche: p.pocket,
    cible: p.targetBps / 100,
    reel: p.actualBps === null ? null : p.actualBps / 100,
  }))
}

/**
 * La dérive vient du service quand il la fournit. À défaut, elle se déduit du
 * couple réel/cible — une soustraction, pas une invention. Une poche dont le
 * réel n'est pas lisible est ÉCARTÉE : une dérive nulle se lirait « alignée ».
 */
function derives(poches: readonly Poche[]): PocheDerive[] {
  const lues: PocheDerive[] = []
  for (const p of poches) {
    const fournie = p.driftBps
    if (typeof fournie === 'number' && Number.isFinite(fournie)) {
      lues.push({ poche: p.pocket, libelle: libellePoche(p), deriveBps: fournie })
      continue
    }
    if (p.actualBps !== null && Number.isFinite(p.actualBps)) {
      lues.push({ poche: p.pocket, libelle: libellePoche(p), deriveBps: p.actualBps - p.targetBps })
    }
  }
  return lues
}

/* ── Verdicts ────────────────────────────────────────────────────────────── */

function verdictDerive(
  rebalancing: Dashboard['rebalancing'],
  pirePocheBps: number | null,
): VerdictAccueil {
  const bloc = rebalancing?.value
  const globale = bloc?.driftBps
  const mesure = typeof globale === 'number' && Number.isFinite(globale) ? globale : pirePocheBps
  const dernier = bloc?.lastRebalanceAt
  const detail =
    typeof dernier === 'string' && dernier !== ''
      ? `Dernier rééquilibrage ${ilYA(dernier)}`
      : 'Aucun rééquilibrage horodaté'

  if (mesure === null || !Number.isFinite(mesure)) {
    return {
      id: 'derive',
      libelle: 'Dérive d’allocation',
      valeur: '—',
      mot: 'Non mesurée',
      ton: 'neutre',
      detail: 'Le service ne renvoie pas d’écart de rééquilibrage',
    }
  }

  const ampleur = Math.abs(mesure)
  let mot = 'Aligné'
  let ton: VerdictAccueil['ton'] = 'sain'
  if (ampleur >= SEUIL_DERIVE_CRITIQUE_BPS) {
    mot = 'Action requise'
    ton = 'critique'
  } else if (ampleur >= SEUIL_DERIVE_ATTENTION_BPS) {
    mot = 'À surveiller'
    ton = 'attention'
  }

  return { id: 'derive', libelle: 'Dérive d’allocation', valeur: points(mesure), mot, ton, detail }
}

/**
 * La réserve couvre l'électricité de la ferme pendant N mois. C'est la mesure
 * de survie opérationnelle du produit : sous six mois, le sujet n'est plus
 * financier, il est industriel. Le seuil est une convention de cette console,
 * annoncée dans le détail affiché.
 */
const SEUIL_ELEC_CONFORTABLE_MOIS = 12
const SEUIL_ELEC_CRITIQUE_MOIS = 6

function verdictElectricite(reserve: Dashboard['reserve']): VerdictAccueil {
  const mois = reserve?.value?.electricityCoveredMonths
  if (typeof mois !== 'number' || !Number.isFinite(mois)) {
    return {
      id: 'electricite',
      libelle: 'Électricité couverte',
      valeur: '—',
      mot: 'Non mesurée',
      ton: 'neutre',
      detail: 'Le service ne renvoie pas de couverture',
    }
  }

  let mot = 'Couverture confortable'
  let ton: VerdictAccueil['ton'] = 'sain'
  if (mois < SEUIL_ELEC_CRITIQUE_MOIS) {
    mot = 'Action requise'
    ton = 'critique'
  } else if (mois < SEUIL_ELEC_CONFORTABLE_MOIS) {
    mot = 'À surveiller'
    ton = 'attention'
  }

  return {
    id: 'electricite',
    libelle: 'Électricité couverte',
    valeur: `${mois.toLocaleString('fr-FR')} mois`,
    mot,
    ton,
    detail: `Réserve ${montantUsdc(reserve?.value?.reserveUsdc, 0)} · seuil de lecture ${SEUIL_ELEC_CONFORTABLE_MOIS} mois`,
  }
}

function verdictService(indisponible: boolean, dernierMouvement: Mouvement | undefined): VerdictAccueil {
  if (indisponible) {
    return {
      id: 'service',
      libelle: 'Disponibilité du service',
      valeur: 'Indisponible',
      mot: 'Action requise',
      ton: 'critique',
      detail: 'La sonde de disponibilité ne répond pas',
    }
  }
  const horodatage = dernierMouvement?.occurredAt
  return {
    id: 'service',
    libelle: 'Disponibilité du service',
    valeur: 'Opérationnel',
    mot: 'Rien à signaler',
    ton: 'sain',
    detail:
      typeof horodatage === 'string' && horodatage !== ''
        ? `Dernier mouvement indexé ${ilYA(horodatage)}`
        : 'Aucun mouvement indexé récemment',
  }
}

/* ── Mesures secondaires ─────────────────────────────────────────────────── */

function tonPerformance(bps: number | null | undefined): AdminKpiItem['tone'] {
  if (bps !== null && bps !== undefined && bps > 0) return 'success'
  return 'default'
}

function mesures(input: {
  d: Dashboard | null
  nombrePoches: number
  dernierMouvement: Mouvement | undefined
}): AdminKpiItem[] {
  const { d, nombrePoches, dernierMouvement } = input
  const capacite = d?.capacity?.value
  const perf = d?.performance?.value
  const souscription = d?.subscription?.value

  return [
    {
      id: 'capacite',
      label: 'Capacité disponible',
      value: montantUsdc(capacite?.availableCapacity, 0),
      hint: 'Reste souscriptible',
    },
    { id: 'plafond', label: 'Plafond TVL', value: montantUsdc(capacite?.tvlCap, 0), hint: 'Plafond contractuel' },
    { id: 'nav', label: 'Valeur de part', value: perf?.navPerShare ?? null, hint: 'navPerShare, en USDC' },
    {
      id: 'performance',
      label: 'Performance',
      value: pourcentage(perf?.totalReturnBps),
      hint: 'Rendement total depuis l’origine',
      tone: tonPerformance(perf?.totalReturnBps),
    },
    {
      id: 'utilisation',
      label: 'Taux d’utilisation',
      value: pourcentage(capacite?.utilizationBps),
      hint: 'Part du plafond engagée',
    },
    {
      id: 'poches',
      label: 'Poches stratégiques',
      value: nombrePoches > 0 ? String(nombrePoches) : null,
      hint: 'Stratégies lisibles sur la chaîne',
    },
    {
      id: 'souscription',
      label: 'Souscription',
      value: souscriptionLisible(souscription?.subscriptionOpen),
      hint:
        souscription?.whitelistRequired === true ? 'Liste blanche exigée' : 'Ticket minimum ci-contre',
    },
    {
      id: 'ticket',
      label: 'Ticket minimum',
      value: montantUsdc(souscription?.minimumDepositAtomic, 0),
      hint: dernierMouvement?.occurredAt ? `Dernier mvt · ${ilYA(dernierMouvement.occurredAt)}` : 'Dépôt initial',
    },
  ]
}

function souscriptionLisible(ouverte: boolean | null | undefined): string | null {
  if (ouverte === true) return 'Ouverte'
  if (ouverte === false) return 'Fermée'
  return null
}

/* ── Répartition des mouvements ──────────────────────────────────────────── */

/**
 * Compte réel des types d'événements indexés — aucune catégorie n'est ajoutée
 * pour « faire joli » : un type absent du flux est absent du graphique.
 */
function repartitionParType(mouvements: readonly Mouvement[]): BarreRepartition[] {
  const compte = new Map<string, number>()
  for (const m of mouvements) {
    const dejaVu = compte.get(m.eventName)
    compte.set(m.eventName, dejaVu === undefined ? 1 : dejaVu + 1)
  }
  return [...compte.entries()].map(([nom, valeur]) => ({ nom: libelleMouvement(nom), valeur }))
}

/* ── État des cadres ─────────────────────────────────────────────────────── */

/**
 * Une série LIVE mais vide n'est pas une série tracée : le cadre doit dire
 * « aucune donnée sur la période » plutôt que d'afficher un graphique nu.
 */
function etatDeSerie(bloc: Resolu<unknown> | undefined, longueur: number, defaut: string, vide: string): EtatSerie {
  const etat = etatSerieDe(bloc, defaut)
  if (etat.type === 'tracee' && longueur === 0) return { type: 'vide', explication: vide }
  return etat
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [dashboard, evenements, disponibilite] = await Promise.all([
    callBackend<Dashboard>('dashboard'),
    callBackend<Evenements>('series1-events', { params: { limit: 12 } }),
    callBackend<{ ready?: boolean }>('ready'),
  ])

  const serviceIndisponible = !disponibilite.ok || disponibilite.data.ready !== true
  const d = dashboard.ok ? dashboard.data : null
  const capacite = d?.capacity?.value
  const mouvements = evenements.ok ? evenements.data.events?.value : null
  const listeMouvements = mouvements === null || mouvements === undefined ? [] : mouvements
  const dernierMouvement = listeMouvements[0]

  const poches = pochesLues(d)
  const barresAllocation = allocations(poches)
  const barresDerive = derives(poches)
  const repartition = repartitionParType(listeMouvements)

  // Le verdict global retient la poche la plus décrochée, pas la moyenne :
  // une moyenne compense une poche en excès par une poche en défaut et rend
  // « aligné » un portefeuille qui ne l'est pas.
  const pirePocheBps =
    barresDerive.length > 0
      ? barresDerive.reduce((pire, p) => (Math.abs(p.deriveBps) > Math.abs(pire) ? p.deriveBps : pire), 0)
      : null

  const alertes = d?.alerts?.value
  const listeAlertes = alertes === null || alertes === undefined ? [] : alertes

  const verdicts: VerdictAccueil[] = [
    verdictDerive(d?.rebalancing, pirePocheBps),
    verdictElectricite(d?.reserve),
    verdictService(serviceIndisponible, dernierMouvement),
  ]

  const metaSnapshot = dernierMouvement?.occurredAt
    ? `Series 1 · snapshot ${ilYA(dernierMouvement.occurredAt)}`
    : 'Series 1 · snapshot live'

  return (
    <>
      <PageHeader title="Hearst Connect — Portefeuille Series 1" meta={metaSnapshot} />

      {serviceIndisponible ? (
        <ExceptionBanner
          message="Le service ne répond pas ou n’est pas prêt."
          href="/admin/runtime"
          actionLabel="État du service"
        />
      ) : null}

      <CockpitSection>
        <AccueilVueEnsemble
          encours={montantUsdc(capacite?.totalAssets, 0)}
          encoursLegende="Actifs mesurés sur la chaîne, libellés en USDC"
          utiliseBps={capacite?.utilizationBps ?? null}
          disponible={montantUsdc(capacite?.availableCapacity, 0)}
          plafond={montantUsdc(capacite?.tvlCap, 0)}
          verdicts={verdicts}
        />

        {/* Les alertes viennent avant les mesures : une console qui fait lire
            huit chiffres avant de signaler un incident inverse les priorités. */}
        <AccueilAlertes alertes={listeAlertes} />

        <AdminKpiSurface items={mesures({ d, nombrePoches: poches.length, dernierMouvement })} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartFrame
              question="L’argent est-il placé là où il devrait l’être ?"
              unite="Part du portefeuille, en %"
              etat={etatDeSerie(
                d?.allocation ?? d?.strategies,
                barresAllocation.length,
                'les poches stratégiques ne sont pas encore lisibles',
                'le service renvoie une allocation sans aucune poche',
              )}
            >
              <AllocationChart poches={barresAllocation} />
            </ChartFrame>
          </div>
          <div className="lg:col-span-1">
            <ChartFrame
              question="Quelle poche a décroché de sa cible ?"
              unite="Écart signé, en points"
              etat={etatDeSerie(
                d?.allocation ?? d?.strategies,
                barresDerive.length,
                'le service ne renvoie pas d’écart d’allocation',
                'aucune poche n’expose d’écart lisible',
              )}
            >
              <AccueilDeriveChart poches={barresDerive} />
            </ChartFrame>
          </div>
        </div>

        {poches.length > 0 ? (
          <div className={clsx(surfaceRaised, 'overflow-hidden')}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-950/5 px-5 py-3 dark:border-white/5">
              <h2 className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase dark:text-zinc-400">
                Poches
              </h2>
              <PocketProgressLegend />
            </div>
            <ul>
              {poches.map((p, i) => (
                <li key={p.pocket}>
                  <Link
                    href="/admin/vault"
                    className={clsx(
                      'flex flex-col gap-3 border-b border-zinc-950/5 px-5 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-6 dark:border-white/5',
                      i === 0 ? 'bg-accent-500/5' : 'hover:bg-zinc-950/[0.02] dark:hover:bg-white/[0.02]',
                    )}
                  >
                    <div className="w-full min-w-0 sm:w-52">
                      <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                        {libellePoche(p)}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        Poche {p.pocket} · écart {points(p.driftBps)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <PocketProgress
                        name={p.pocket}
                        cible={p.targetBps / 100}
                        reel={p.actualBps === null ? null : p.actualBps / 100}
                        showName={false}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CockpitSection>

      <CockpitSection
        index="02"
        title="Activité récente"
        description={
          dernierMouvement
            ? `${phraseMouvement(dernierMouvement.eventName)} · ${dernierMouvement.occurredAt ? ilYA(dernierMouvement.occurredAt) : '—'}`
            : 'Mouvements indexés Series 1'
        }
        actions={
          <Link
            href="/admin/operations"
            className="text-xs font-medium text-accent-600 hover:text-accent-500 dark:text-accent-400"
          >
            Registre →
          </Link>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <ChartFrame
              question="De quoi est faite l’activité récente ?"
              unite="Nombre d’événements indexés"
              etat={etatDeSerie(
                evenements.ok ? evenements.data.events : undefined,
                repartition.length,
                'les mouvements ne sont pas encore indexés',
                'aucun mouvement relevé sur la période',
              )}
            >
              <DistributionBarChart barres={repartition} />
            </ChartFrame>
          </div>

          <div className="lg:col-span-3">
            {listeMouvements.length === 0 ? (
              <CalmState message="Aucun mouvement relevé récemment." />
            ) : (
              <Panel inset="none" className="overflow-hidden">
                <PanelHeading title="Mouvements" />
                <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                  {listeMouvements.slice(0, 8).map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                          {phraseMouvement(m.eventName)}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{ilYA(m.occurredAt)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-accent-600 dark:text-accent-400">
                        {m.assetAmountAtomic !== null ? montantUsdc(m.assetAmountAtomic, 2) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </CockpitSection>

      {/* Les raccourcis ferment la page : on navigue APRÈS avoir lu l'état,
          pas avant. Ils ne sont plus le contenu principal de l'accueil. */}
      <nav aria-label="Accès rapides" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ShortcutRow
          href="/admin/operations"
          title="Registre des opérations"
          status="Mouvements on-chain"
          icon={ArrowsRightLeftIcon}
        />
        <ShortcutRow
          href="/admin/runtime"
          title="État du service"
          status={serviceIndisponible ? 'Indisponible' : 'Sondes runtime'}
          icon={ServerStackIcon}
        />
        <ShortcutRow href="/admin/vault" title="Vault" status="Stratégies et rééquilibrage" icon={CircleStackIcon} />
        <ShortcutRow
          href="/admin/administration"
          title="Administration"
          status="Équipe, traces, réglages"
          icon={Cog6ToothIcon}
        />
      </nav>
    </>
  )
}
