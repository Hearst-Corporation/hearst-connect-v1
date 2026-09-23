'use client'

import { useState, type ReactNode } from 'react'
import './user-dashboard.css'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  BanknotesIcon,
  LockClosedIcon,
  HomeIcon,
  QuestionMarkCircleIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  CircleStackIcon,
  CpuChipIcon,
  PresentationChartLineIcon,
  ScaleIcon,
  SignalIcon,
  Squares2X2Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'
import {
  HearstExposureRadial,
  HearstLineChart,
  SignedBarChart,
} from '@/components/charts'
import type { SeriesState } from '@/components/charts/core/chart-frame'
import { AdminHeroTitle } from '@/components/admin/typography'
import { logout } from '@/lib/actions'
import { formatDateTime, formatNumber, formatPercent, formatDate} from '@/lib/format'
import { readableSourceStateCap } from '@/lib/movements'
import { userInitials } from '@/components/layout/user-avatar-trigger'
import type { SessionUser } from '@/lib/session'
import { available, isAvailable, signalOf, valueOf, type Availability, type Signal } from '@/lib/vaults/model'
import { StatTile, deltaOf } from './stat-tile'
import { BreakdownFlank } from './breakdown-flank'
import { MiningEconomicsFlank } from './mining-economics-flank'
import { ComputeFleetPanel } from './compute-fleet-panel'
import { DottedH } from '@/assets/brand/dotted-h'
import { BitcoinIcon } from '@/assets/brand/bitcoin'
import { InstagramIcon, LinkedInIcon, XIcon } from '@/assets/brand/social'
import { MovementTimeline } from './movement-timeline'
import { VaultActions } from './vault-actions'
import { BtcPricePanel } from './btc-price-panel'
import { HearstAllocationStackChart } from '@/components/charts/richart/allocation-stack-chart'
import { DistributionsDonut } from './distributions-donut'
import { ProjectionTable } from './projection-table'
import type { AllocationBar, UserDashboard } from './load'
import { HearstConnectLockupImage, LogoMark } from '@/components/logo'
import { DepositForm } from './deposit-form'
import { BtcPositionHeadline } from './btc-position'

/**
 * Account command center — session-scoped premium composition.
 * Widgets: animated stat-tile strip, a central chart switched by an iconified
 * segmented control with a sliding pill + crossfade, side donuts, a strategy
 * exposure (target vs actual) + capacity meter section, and a movement timeline
 * with a subscription-terms rail. All motion honors prefers-reduced-motion via
 * MotionConfig + the shared motion-ready guard. Backend-first: every absence is
 * a named state, never a fabricated zero. Charts only via the charts boundary.
 *
 * Reachable only with a valid console session (login remains admin-gated today).
 */

type CentralView = 'btc' | 'allocation' | 'compute'
type Route = 'dashboard' | 'trade'

/**
 * Comptes sociaux de Hearst. Une seule table pour les deux emplacements — le
 * rail desktop et le panneau mobile — de sorte qu'un lien ajouté ici apparaisse
 * aux deux, sans qu'une liste puisse dériver de l'autre.
 */
/* Année du copyright, calculée UNE fois au chargement du module. `new Date()`
   dans le rendu s'évaluerait côté serveur puis côté client : au passage d'un
   1er janvier, ou sur deux fuseaux, les deux valeurs divergent et React signale
   une erreur d'hydratation. */
const COPYRIGHT_YEAR = new Date().getFullYear()

const SOCIAL_LINKS = [
  { label: 'X', href: 'https://x.com/Hearst_io', Icon: XIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/hearstio/', Icon: LinkedInIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/hearst.io/', Icon: InstagramIcon },
] as const

/**
 * Inscription à la newsletter.
 *
 * Aucun backend d'abonnement n'existe : le formulaire ouvre un courriel
 * pré-adressé plutôt que de simuler une inscription qui n'enregistrerait rien.
 * L'adresse saisie voyage dans le corps du message, et l'utilisateur voit
 * exactement ce qu'il envoie — pas de confirmation de façade.
 *
 * Quand un service d'abonnement existera, seul `onSubmit` change ; la forme
 * tient telle quelle.
 */
function NewsletterForm({ className }: Readonly<{ className: string }>) {
  const [email, setEmail] = useState('')

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        const address = email.trim()
        if (address === '') return
        window.location.href = `mailto:connect@hearstcorporation.io?subject=${encodeURIComponent(
          'Newsletter subscription',
        )}&body=${encodeURIComponent(`Please subscribe this address to the newsletter: ${address}`)}`
      }}
    >
      <p className="newsletter-title">Subscribe to our newsletter</p>
      <p className="newsletter-copy">Stay up to date on features and releases.</p>
      <div className="newsletter-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          aria-label="Your email address"
        />
        <button type="submit">Subscribe</button>
      </div>
    </form>
  )
}

/** Rangée d'icônes sociales. `rel` complet : ces liens quittent l'application. */
function SocialLinks({ className }: Readonly<{ className: string }>) {
  return (
    <div className={className}>
      {SOCIAL_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
        >
          <Icon className="size-4" />
        </a>
      ))}
    </div>
  )
}

const CENTRAL_VIEWS: readonly {
  readonly key: CentralView
  readonly label: string
  readonly icon: typeof PresentationChartLineIcon
}[] = [
  // « Mining economics » en tête : c'est ce qui distingue le produit. Le cours
  // du BTC n'est plus un onglet — il vit dans le flanc droit, avec son
  // historique et ses fenêtres, plutôt que d'occuper deux endroits.
  { key: 'btc', label: 'BTC price', icon: CurrencyDollarIcon },
  { key: 'allocation', label: 'Allocation', icon: ChartPieIcon },
  // Le parc ferme la série : il dit ce qui PRODUIT le bitcoin, après ce que
  // vaut le vault et comment il se répartit.
  //
  // « Projection » a quitté le panneau : des scénarios Monte-Carlo à trois
  // horizons ajoutaient douze montants hypothétiques à un écran que l'équipe
  // produit trouvait déjà trop chargé — et une hypothèse ne se lit pas au même
  // rang que ce qui est constaté.
  { key: 'compute', label: 'Compute', icon: CpuChipIcon },
]

function seriesState(
  availability: { kind: 'available' | 'unavailable' },
  hasPoints: boolean,
  emptyMsg: string,
  unavailableMsg: string,
): SeriesState {
  if (availability.kind === 'unavailable') return { type: 'unavailable', explanation: unavailableMsg }
  if (!hasPoints) return { type: 'empty', explanation: emptyMsg }
  return { type: 'plotted' }
}

function investorPositionAbsent(data: UserDashboard): boolean {
  if (isAvailable(data.positionValue)) return false
  // Only the backend's named absence counts — a generic unavailable (outage,
  // db_error) is "position offline", never "no position".
  const reasons = new Set(['no_investor_position', 'no_investor_record'])
  if (data.positionValue.kind === 'unavailable' && data.positionValue.reason !== null && reasons.has(data.positionValue.reason)) {
    return true
  }
  if (data.position.kind === 'unavailable' && data.position.reason !== null && reasons.has(data.position.reason)) {
    return true
  }
  return false
}

function formatUsdc(amount: number | null): string {
  return amount !== null ? `${formatNumber(amount, { maximumFractionDigits: 0 })} USDC` : '—'
}

function freshnessLabel(signal: Signal): string | null {
  if (signal === 'live') return 'Live'
  if (signal === 'stale') return 'Stale'
  return null
}

function TermRow({
  icon: Icon,
  label,
  value,
}: Readonly<{ icon: typeof ScaleIcon; label: string; value: string }>) {
  return (
    <div className="term-row">
      <span className="term-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="term-label">{label}</span>
      <span className="term-value mono">{value}</span>
    </div>
  )
}

/**
 * Ce que produit chaque poche, en une ligne.
 *
 * Éditorial : le factsheet expose des libellés et des pourcentages, pas de
 * description. Clé = le libellé exact renvoyé par la source ; une poche absente
 * de cette table n'affiche pas de ligne, plutôt qu'un texte vague.
 */
const POCKET_BRIEF: Record<string, string> = {
  'Basis carry': 'Écart entre spot et futures, couvert — rendement sans pari directionnel',
  'RWA T-bills': "Bons du Trésor tokenisés — la poche défensive de l'allocation",
  'Mining alpha': 'Bitcoin produit par notre propre infrastructure de minage',
}

export function UserDashboardView({
  data,
  user,
}: Readonly<{ data: UserDashboard; user: SessionUser }>) {
  const [route, setRoute] = useState<Route>('dashboard')
  /* Ouverture du menu mobile. Fermé à chaque navigation : laisser le panneau
     ouvert sur la vue qu'on vient d'atteindre cacherait le résultat du clic. */
  const [menuOpen, setMenuOpen] = useState(false)
  const [central, setCentral] = useState<CentralView>('btc')
  const initials = userInitials(user.name)

  const isDashboard = route === 'dashboard'

  const valuePoints = valueOf(data.valueSeries)
  const allocationTime = valueOf(data.allocationSeries)
  const allocationState = seriesState(
    data.allocationSeries,
    allocationTime !== null && allocationTime.length > 1,
    'Allocation history is not deep enough to plot yet.',
    'Awaiting a verified allocation source.',
  )
  const btcPoints = valueOf(data.btcSeries)
  const btcState = seriesState(
    data.btcSeries,
    btcPoints !== null && btcPoints.length > 1,
    'Not enough BTC history to plot yet.',
    'Awaiting a verified market source.',
  )
  // Projection Monte-Carlo : deux points au moins, sinon il n'y a pas de bande
  // à tracer — une projection d'un seul point n'est pas une projection.
  const projection = valueOf(data.projection)
  const projectionState = seriesState(
    data.projection,
    projection !== null && projection.points.length > 1,
    'Not enough horizon to project this vault yet.',
    'Awaiting a verified projection source.',
  )

  // Le parc. Son absence est NOMMÉE comme les autres : une source illisible
  // n'affiche pas un parc vide, elle dit qu'elle n'a rien à montrer.
  const computeFleet = valueOf(data.fleet)
  const computeState = seriesState(
    data.fleet,
    computeFleet !== null,
    'No fleet is reporting capacity yet.',
    'Awaiting a verified fleet source.',
  )

  const exposurePockets = valueOf(data.exposure)
  const exposureState = seriesState(
    data.exposure,
    exposurePockets !== null && exposurePockets.length > 0,
    'No pockets defined for this vault.',
    'Allocation terms did not resolve.',
  )

  const positionAbsent = investorPositionAbsent(data)
  const positionValue = valueOf(data.positionValue)
  const positionPrincipal = valueOf(data.positionPrincipal)
  const positionAccrued = valueOf(data.positionAccrued)

  // Contrevaleur BTC des montants du book, au spot. Le produit se vend en
  // bitcoin : chaque montant en dollars gagne sa lecture dans l'unité du
  // client. Dérivée, jamais un solde détenu — d'où la ligne secondaire et non
  // une seconde valeur de tuile. Sans cours lisible, rien ne s'affiche : mieux
  // vaut une tuile en dollars seuls qu'un montant BTC bâti sur un taux supposé.
  const btcProduced = valueOf(data.btcProducedTotal)
  const btcSpotUsd = valueOf(data.marketSnapshot)?.btcUsd ?? null
  /*
   * Le bitcoin porte la valeur PRINCIPALE des tuiles, le dollar sa contrevaleur.
   * Les deux restent dérivés du book USDC au spot : sans cours lisible, la tuile
   * retombe sur le montant en dollars plutôt que d'afficher un BTC bâti sur un
   * taux supposé — mieux vaut la bonne unité manquante que la mauvaise inventée.
   */
  const btcValue = (usdc: number | null): string =>
    usdc !== null && btcSpotUsd !== null && btcSpotUsd > 0
      ? `${(usdc / btcSpotUsd).toFixed(4)} BTC`
      : formatUsdc(usdc)

  const usdAside = (usdc: number | null): string | null =>
    usdc !== null && btcSpotUsd !== null && btcSpotUsd > 0 ? `≈ ${formatUsdc(usdc)}` : null

  // ── Vault dédié ───────────────────────────────────────────────────────────
  // Un vault PAR CLIENT : ces montants sont les siens, pas une quote-part d'un
  // pool. Les parts sont calculées ici, jamais lues — deux sources pour un même
  // ratio finissent par diverger.
  const vault = valueOf(data.vaultAccount)
  const vaultLabel = vault?.label ?? 'Dedicated vault'
  const vaultPrincipal = vault?.principalUsdc ?? null
  const vaultWithdrawn = vault?.withdrawnUsdc ?? null
  const vaultAvailable = vault?.availableUsdc ?? null

  /**
   * Capital souscrit — en DOLLARS, tel que versé.
   *
   * Il n'est pas converti en bitcoin à l'entrée : il est réparti entre les trois
   * poches (Basis carry, RWA T-bills, Mining alpha), dont deux travaillent en
   * dollars. Afficher un montant en bitcoin laissait croire à un achat spot au
   * jour de la souscription — ce que le produit ne fait pas.
   *
   * Le bitcoin de ce vault n'est pas un capital converti : c'est ce que le
   * minage PRODUIT, et ce que le rebalancing accumule. Il se lit dans les tuiles
   * qui portent cette production, pas ici.
   *
   * Le cours de souscription (`entryRateUsd`) sert ailleurs : c'est la référence
   * de la comparaison au simple achat, calculée dans `load.ts`.
   */
  const subscribedValue = (usdc: number | null): string => formatUsdc(usdc)

  const shareOfPrincipal = (amount: number | null): number | null =>
    amount !== null && vaultPrincipal !== null && vaultPrincipal > 0
      ? (amount / vaultPrincipal) * 100
      : null

  const withdrawnShare = shareOfPrincipal(vaultWithdrawn)

  /*
   * Avancement du blocage du capital.
   *
   * Compté en MOIS PLEINS depuis le début, pas en millisecondes : le mois est
   * l'unité du contrat, et une fraction de mois n'a pas de sens à l'écran. La
   * date du jour est prise une fois au rendu — un décalage d'un jour entre
   * serveur et client ne change pas un compte en mois entiers, donc pas de
   * divergence d'hydratation à craindre ici.
   */
  const lockup = ((): { elapsed: number; total: number; pct: number } | null => {
    if (vault?.lockupStartAt == null || vault.lockupMonths == null) return null
    const start = new Date(vault.lockupStartAt)
    if (Number.isNaN(start.getTime()) || vault.lockupMonths <= 0) return null
    const now = new Date()
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
    const elapsed = Math.max(0, Math.min(months, vault.lockupMonths))
    return { elapsed, total: vault.lockupMonths, pct: (elapsed / vault.lockupMonths) * 100 }
  })()

  const nextDistributionLabel =
    vault?.nextDistributionAt != null ? `next on ${formatDate(vault.nextDistributionAt)}` : null

  const positionStatus = valueOf(data.positionStatus)
  const positionSubscribedAt = valueOf(data.positionSubscribedAt)
  const utilization = valueOf(data.utilizationPct)
  const availableCapacity = valueOf(data.availableCapacity)
  const minimumDeposit = valueOf(data.minimumDeposit)


  const centralChart: Record<
    CentralView,
    { question: string; unit: string; state: SeriesState; node: ReactNode; source: Availability<unknown> }
  > = {
    btc: {
      question: 'BTC price',
      unit: 'USD · select a period below',
      state: btcState,
      node: btcPoints !== null ? <BtcPricePanel points={[...btcPoints]} /> : null,
      source: data.btcSeries,
    },
    compute: {
      // Le parc industriel derrière le vault, et la part qui revient au client.
      //
      // Le sous-titre disait « not your own share » — vrai quand le panneau ne
      // montrait que le parc, faux depuis que la bande « Allocated to your
      // vault » l'ouvre. Il se tronquait de surcroît sur téléphone. Deux mots
      // suffisent : le panneau distingue lui-même les deux échelles.
      question: 'Compute infrastructure',
      unit: 'your share and the fleet behind it',
      state: computeState,
      node: computeFleet !== null ? (
        <ComputeFleetPanel
          fleet={computeFleet}
          networkHashrateEhs={valueOf(data.productionCost)?.hashrateEhs ?? null}
        />
      ) : null,
      source: data.fleet,
    },
    allocation: {
      // La composition du vault, poche par poche — plus « cbBTC vs USDC », un
      // découpage qui ne correspondait à aucune stratégie du produit.
      question: 'Vault composition',
      unit: 'share of vault by strategy · %',
      state: allocationState,
      node:
        allocationTime !== null ? (
          <HearstAllocationStackChart points={[...allocationTime]} viewport="hero" />
        ) : null,
      source: data.allocationSeries,
    },
  }
  const active = centralChart[central]
  const fresh = freshnessLabel(signalOf(active.source))

  const centralBody =
    active.state.type === 'plotted' ? (
      active.node
    ) : (
      <div className={`center-state${active.state.type === 'unavailable' ? ' is-bad' : ''}`}>
        <span className="empty-mark" />
        <p>{active.state.explanation}</p>
      </div>
    )

  return (
    <MotionConfig reducedMotion="user">
      <div className="ud-root">
        {/* Pas de couche de halo ici : les maquettes /account posent des gris
            neutres et opaques. Le glow mint reste le matériau de /admin, où le
            shell est en verre. */}
        <main className="page">
          <div className="shell">
            {/* Rail latéral — structure des maquettes Hearst : marque en haut,
                navigation au centre, support en pied. Le rail est opaque : il
                ancre l'écran, le contenu à droite porte le verre. */}
            <aside className="rail" aria-label="Account sections">
              {/* Le logo ramène à l'accueil : sur mobile il remplace l'entrée
                  « Home », qui ne fait que ça. Un bouton et non un lien — la vue
                  est un état local, pas une route. */}
              <button
                type="button"
                className="rail-brand"
                aria-current={route === 'dashboard' ? 'page' : undefined}
                onClick={() => setRoute('dashboard')}
              >
                <HearstConnectLockupImage className="h-10 w-auto" />
                <span className="sr-only">Home</span>
              </button>

              <nav className="rail-nav">
                {(
                  [
                    ['dashboard', 'Home', HomeIcon],
                    ['trade', 'Trade', ArrowsRightLeftIcon],
                  ] as const
                ).map(([r, label, Icon]) => (
                  <button
                    key={r}
                    type="button"
                    className={`rail-item rail-item--${r}${route === r ? ' active' : ''}`}
                    aria-current={route === r ? 'page' : undefined}
                    onClick={() => setRoute(r as Route)}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}

                {/* Support rejoint la navigation plutôt que de rester isolé en
                    pied de rail. Il garde sa nature de LIEN — c'est un courriel,
                    pas une vue — d'où la balise `a` au milieu des boutons ; seule
                    l'apparence est commune. */}
                <a
                  className="rail-item rail-item--support"
                  href="mailto:connect@hearstcorporation.io?subject=Hearst%20Connect%20support"
                >
                  <QuestionMarkCircleIcon className="size-4" aria-hidden="true" />
                  <span>Support</span>
                </a>
              </nav>

              {/* Navigation mobile — n'apparaît que sous 768px, où la topbar et
                  la nav latérale sont masquées. Le CSS décide de sa visibilité :
                  un seul balisage, pas de détection de largeur en JS. */}
              <button
                type="button"
                className="rail-burger"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {/* Trois traits dessinés, pas une icône : leur épaisseur et leur
                    écart se règlent au pixel, et ils portent le vert de marque. */}
                <span className="rail-burger-bars" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              </button>

              <SocialLinks className="rail-social" />

              {/* Panneau du burger. Rendu dans le rail, donc juste sous la barre
                  dont il descend. `hidden` plutôt qu'un rendu conditionnel : le
                  panneau garde son identité entre deux ouvertures, et le lecteur
                  d'écran suit l'état annoncé par `aria-expanded`. */}
              <div className="rail-menu" id="mobile-nav" hidden={!menuOpen}>
                {/* Fermeture explicite : le burger referme aussi, mais il est
                    hors du panneau ouvert et l'œil ne l'y cherche pas. */}
                <button
                  type="button"
                  className="rail-menu-close"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                >
                  <XMarkIcon className="size-5" aria-hidden="true" />
                </button>

                <nav className="rail-menu-nav" aria-label="Main">
                  {(
                    [
                      ['dashboard', 'Home', HomeIcon],
                      ['trade', 'Trade', ArrowsRightLeftIcon],
                    ] as const
                  ).map(([r, label, Icon]) => (
                    <button
                      key={r}
                      type="button"
                      className={`rail-menu-item${route === r ? ' active' : ''}`}
                      aria-current={route === r ? 'page' : undefined}
                      onClick={() => {
                        setRoute(r as Route)
                        setMenuOpen(false)
                      }}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                      <span>{label}</span>
                    </button>
                  ))}

                  <a
                    className="rail-menu-item"
                    href="mailto:connect@hearstcorporation.io?subject=Hearst%20Connect%20support"
                    onClick={() => setMenuOpen(false)}
                  >
                    <QuestionMarkCircleIcon className="size-5" aria-hidden="true" />
                    <span>Support</span>
                  </a>
                </nav>

                <SocialLinks className="rail-menu-social" />

                {/* Détaché du groupe : sortir du compte n'est pas une destination
                    de plus. Le filet et l'écart le disent avant le libellé. */}
                <button
                  type="button"
                  className="rail-menu-signout"
                  onClick={() => {
                    void logout()
                  }}
                >
                  <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                  <span>Sign out</span>
                </button>

                <NewsletterForm className="rail-menu-newsletter" />
              </div>
            </aside>

            <div className="content">
              <header className="topbar">
                <div className="account-state">
                  <i data-signal={signalOf(data.positionValue)} />
                  <span className="sync-label">
                    {isAvailable(data.positionValue) ? 'Position live' : positionAbsent ? 'No investor position' : 'Position offline'}
                  </span>
                </div>
                <div className="topbar-user">
                  <span className="avatar" title={user.email} aria-label={user.name}>
                    {initials || 'HC'}
                  </span>
                  <span className="topbar-name">{user.name}</span>
                  <button
                    type="button"
                    className="sign-out"
                    onClick={() => {
                      void logout()
                    }}
                  >
                    <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              </header>

            {isDashboard ? (
            <div className="dashboard-view">
              <header className="page-intro">
                <div>
                  <p className="eyebrow">Account</p>
                  <AdminHeroTitle>Command center</AdminHeroTitle>
                </div>

              </header>

              <section className="your-position" aria-label="Your position">
                <div className="section-heading position-heading">
                  <div className="position-heading-text">
                    <p className="eyebrow">Your position</p>
                    <h2>Bitcoin Strategic Reserve</h2>
                    {/* Pas de sous-titre : le titre se suffit, et la
                        jauge annonce elle-même la comparaison au HODL. */}
                  </div>
                  <DepositForm
                    minimumUsdc={minimumDeposit}
                    capacityUsdc={availableCapacity}
                  />
                </div>
                {positionAbsent ? (
                  <div className="position-absent">
                    <span className="empty-mark" />
                    <div>
                      <h3>No investor position</h3>
                      <span>
                        No book position is linked to this account — figures stay absent rather than zero.
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Capital, état et date d'entrée REJOIGNENT le bandeau : ce
                    sont des constantes du contrat, pas des mesures qui bougent.
                    En tuiles pleines sous la réserve, elles occupaient le même
                    rang visuel que la production et les retraits — et la rangée
                    entière a donc disparu.

                    « Accrued » et « Reserve value » n'y reviennent pas : la
                    première répétait « Earned to date », la seconde le grand
                    chiffre du bandeau. */}
                <BtcPositionHeadline
                  positionBtc={data.positionBtc}
                  vsHodl={data.btcVsHodl}
                  terms={[
                    {
                      label: 'Principal',
                      value: subscribedValue(positionPrincipal),
                      icon: ScaleIcon,
                      signal: signalOf(data.positionPrincipal),
                    },
                    {
                      label: 'Status',
                      value:
                        positionStatus !== null ? readableSourceStateCap(positionStatus) : '—',
                      icon: SignalIcon,
                      signal: signalOf(data.positionStatus),
                    },
                    {
                      label: 'Subscribed at',
                      value:
                        positionSubscribedAt !== null ? formatDate(positionSubscribedAt) : '—',
                      icon: CalendarDaysIcon,
                      signal: signalOf(data.positionSubscribedAt),
                    },
                  ]}
                />
              </section>

              <section className="fund-vault" aria-label="Your vault">
                {/* Même patron que « Your position » : titre à gauche, action à
                    droite. Le retrait vivait dans une barre sous les tuiles, qui
                    ajoutait une rangée et décrochait les séparateurs des blocs
                    suivants. */}
                <div className="section-heading vault-heading">
                  <div className="vault-heading-text">
                    <p className="eyebrow">Your vault</p>
                    <h2>{vaultLabel}</h2>
                    <span>
                      Your own vault — capital, distributions and withdrawals. Nothing here is
                      shared with another client.
                    </span>
                  </div>
                  <VaultActions vault={data.vaultAccount} onWithdraw={() => setRoute('trade')} />
                </div>

                <section className="fund-kpis" aria-label="Vault indicators">
                  {/* BTC produced en tête : c'est la mesure du produit. Le
                      capital investi a quitté la grille — il est déjà le
                      dénominateur des deux parts affichées plus loin, et le
                      répéter en tuile ajoutait un chiffre sans lecture propre. */}
                  <StatTile
                    icon={BitcoinIcon}
                    label="Produced for your vault"
                    value={btcProduced !== null ? `${formatNumber(btcProduced, { maximumFractionDigits: 3 })} BTC` : '—'}
                    signal={signalOf(data.btcProducedTotal)}
                    /* « for your vault », et non « by the mining infrastructure » :
                       la valeur vient de `/api/v1/btc`, scopée au client, alors que
                       l'ancienne note faisait lire ce chiffre comme la production
                       de TOUT le parc — laquelle vit dans l'onglet Compute, à son
                       échelle propre (750 BTC). Deux ordres de grandeur pour deux
                       faits distincts : le libellé doit les séparer. */
                    footnote={btcProduced !== null ? 'mined for you since subscription' : null}
                  />
                  <StatTile
                    icon={ArrowDownTrayIcon}
                    label="Available to withdraw"
                    value={btcValue(vaultAvailable)}
                    aside={usdAside(vaultAvailable)}
                    signal={signalOf(data.vaultAccount)}
                    footnote={nextDistributionLabel}
                  />
                  {/* Bitcoin seul sur cette tuile et sur « Earned to date » :
                      elles portent des FLUX de rendement, dont l'unité est celle
                      du produit — la contrevaleur en dollars n'y ajoute rien. */}
                  <StatTile
                    icon={ArrowUpTrayIcon}
                    label="Withdrawn to date"
                    value={btcValue(vaultWithdrawn)}
                    /* Les dollars RÉELLEMENT encaissés, chaque retrait à son
                       cours — pas le cumul reconverti au spot du jour, qui
                       afficherait une somme que le client n'a jamais reçue.
                       « received » le dit : c'est un historique, pas une
                       conversion. Absent si la source ne le publie pas. */
                    aside={
                      vault?.withdrawnUsdcAtPayout != null
                        ? `≈ ${formatUsdc(vault.withdrawnUsdcAtPayout)}`
                        : null
                    }
                    signal={signalOf(data.vaultAccount)}
                    meter={withdrawnShare !== null ? withdrawnShare / 100 : null}
                    footnote={
                      withdrawnShare !== null
                        ? `${formatPercent(withdrawnShare, { maximumFractionDigits: 1 })} of capital invested`
                        : null
                    }
                  />
                  {/* Pas de jauge de blocage ici : le rendement est VERSÉ
                      mensuellement, c'est le capital qui reste engagé. */}
                  <StatTile
                    icon={ScaleIcon}
                    label="Earned to date"
                    value={btcValue(positionAccrued)}
                    signal={signalOf(data.positionAccrued)}
                    footnote={
                      positionAccrued !== null ? 'paid out monthly' : null
                    }
                  />

                  {/* Le capital engagé porte l'échéance : c'est LUI qui est
                      bloqué, et rien d'autre à l'écran ne dit où en est le
                      terme. */}
                  <StatTile
                    icon={BanknotesIcon}
                    label="Capital locked"
                    /* Une DURÉE, pas un montant. Le capital souscrit ne reste
                       pas 420 000 $ : il travaille dans les trois poches, dont
                       celle du minage produit du bitcoin — ce qui sortira au
                       terme peut valoir plus ou moins. Afficher la somme versée
                       laissait croire à une créance figée.
                       
                       Ce que le blocage dit vraiment, c'est COMBIEN DE TEMPS les
                       fonds sont engagés. La jauge en dessous porte l'avancement. */
                    value={
                      lockup !== null ? `${lockup.total - lockup.elapsed} of ${lockup.total}` : '—'
                    }
                    signal={signalOf(data.vaultAccount)}
                    meter={lockup !== null ? lockup.pct / 100 : null}
                    footnote={lockup !== null ? 'months remaining' : null}
                  />
                  {/* Cinq tuiles : la grille est pleine sur cinq et trois
                      colonnes, mais laisse une case en deux. Le motif l'occupe
                      là — le CSS décide, comme pour `position-grid`. */}
                  <div className="position-grid-mark" aria-hidden="true">
                    <DottedH className="position-grid-mark-svg" />
                  </div>
                </section>

                <section className="analysis analysis--fund" aria-label="Fund analysis">
                  <BreakdownFlank
                    title="Vault allocation"
                    hint="Vault capital by bucket"
                    icon={ChartPieIcon}
                    availability={data.allocationBars}
                    kind="percent"
                    unit="%"
                    centerCaption="allocated"
                  />

                  <div className="center">
                    <div className="center-panel">
                      {/* Sur téléphone, un `select` natif remplace les cinq
                          onglets : ils ne tiennent pas sur 375px, et le
                          sélecteur système est plus confortable qu'un menu
                          maison. Les deux existent dans le DOM, le CSS n'en
                          montre qu'un — un seul état, aucune désynchronisation
                          possible. */}
                      <select
                        className="chart-switch-select"
                        aria-label="Fund chart"
                        value={central}
                        onChange={(e) => setCentral(e.target.value as typeof central)}
                      >
                        {CENTRAL_VIEWS.map((view) => (
                          <option key={view.key} value={view.key}>
                            {view.label}
                          </option>
                        ))}
                      </select>

                      <div className="chart-switch" role="group" aria-label="Fund chart">
                        {CENTRAL_VIEWS.map((view) => {
                          const Icon = view.icon
                          const selected = central === view.key
                          return (
                            <button
                              key={view.key}
                              type="button"
                              aria-pressed={selected}
                              className={selected ? 'active' : undefined}
                              onClick={() => setCentral(view.key)}
                            >
                              {selected ? (
                                <motion.span layoutId="ud-central-pill" className="switch-pill" aria-hidden="true" />
                              ) : null}
                              <span className="switch-inner">
                                <Icon className="size-4" aria-hidden="true" />
                                {view.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      <div className="center-head">
                        <h2>{active.question}</h2>
                        <span>{active.unit}</span>
                        {fresh !== null ? (
                          <span className="fresh-badge" data-signal={signalOf(active.source)}>
                            {fresh}
                          </span>
                        ) : null}
                      </div>
                      <div className="center-plot">
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={central}
                            className="center-plot-inner"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                          >
                            {centralBody}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <MiningEconomicsFlank
                    cost={data.productionCost}
                    hashprice={valueOf(data.marketSnapshot)?.hashprice ?? null}
                  />
                </section>

                {/* Panneau unique : « Fund capacity » doublonnait le bandeau du
                    dessus (Fund utilization + capacity left). L'espace revient à
                    l'exposition, qui a des poches à détailler. Le minimum de
                    dépôt, lui, n'existait qu'ici — il reste en pied. */}
                <section className="exposure-cap" aria-label="Strategy exposure">
                  <div className="ec-panel">
                    <div className="ec-heading">
                      <h2>
                        <PresentationChartLineIcon className="size-4" aria-hidden="true" />
                        Strategy exposure
                      </h2>
                      <span>Target vs actual · % of vault</span>
                    </div>
                    <div className="ec-body">
                      {exposureState.type === 'plotted' && exposurePockets !== null ? (
                        /* Le capital de référence est celui de CE vault, pas
                           l'AUM d'un fonds : les montants par poche sont ceux
                           du client. Le rendement rejoint la ligne de sa poche
                           — un bloc séparé rejouait les mêmes libellés pour
                           n'ajouter qu'une colonne. */
                        <HearstExposureRadial
                          items={[...exposurePockets]}
                          aumUsdc={vaultPrincipal}
                          briefs={POCKET_BRIEF}
                          yields={valueOf(data.bucketYields)}
                        />
                      ) : (
                        <div className={`center-state${exposureState.type === 'unavailable' ? ' is-bad' : ''}`}>
                          <span className="empty-mark" />
                          <p>{exposureState.type !== 'plotted' ? exposureState.explanation : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </section>

              <section className="your-account" aria-label="Your account">
                <div className="section-heading">
                  <p className="eyebrow">Your account</p>
                  <h2>Capital activity</h2>
                  <span>Your verified deposits, distributions and movements only</span>
                </div>
                <div className="your-account-body">
                  <section className="movements" aria-label="Your movements">
                    <div className="movements-heading">
                      <div>
                        <h3>Your movements</h3>
                      </div>
                      <span>
                        Verified data only · {isAvailable(data.activityCount) ? data.activityCount.value : '—'} total
                      </span>
                    </div>
                    <MovementTimeline availability={data.activity} btcSpotUsd={btcSpotUsd} />
                  </section>
                  <DistributionsDonut distributions={data.distributions} />
                </div>
              </section>
            </div>
            ) : null}

            {!isDashboard ? (
            <section className="trade-view active">
              <div>
                <p className="eyebrow">Execution only</p>
                <AdminHeroTitle>Trade terminal</AdminHeroTitle>
                <p>
                  This space is strictly reserved for execution. No catalog, quote or account
                  management element is presented here.
                </p>
              </div>
            </section>
            ) : null}

            {/* Pied de page — mobile seulement : sur desktop, le rail latéral
                porte déjà la marque et les liens en permanence, alors qu'en
                barre horizontale il ne reste que le logo et le burger. */}
            <footer className="ud-footer">
              {/* Le H seul, pas le lockup : au pied d'une page qui porte déjà la
                  marque en tête, le monogramme suffit — et il prend la couleur
                  du CSS, ce qu'une image ne permet pas. */}
              {/* `viewBox` resserré sur le tracé : celui de `LogoMark` porte
                  12.6 unités de vide à gauche sur 155 (8 %), qui décalaient le H
                  vers l'intérieur alors que les blocs au-dessus commencent au
                  bord du padding. Le composant reste intact pour ses autres
                  usages — seule cette instance recadre. */}
              <span className="ud-footer-brand" aria-label="Hearst">
                <LogoMark className="h-9 w-auto" viewBox="12.6 11.87 129.26 142.86" />
              </span>
              <p className="ud-footer-copy">© {COPYRIGHT_YEAR} Hearst. All rights reserved.</p>
              <div className="ud-footer-links">
                <a href="mailto:connect@hearstcorporation.io?subject=Terms%20%26%20conditions">
                  Terms &amp; conditions
                </a>
                <a href="mailto:connect@hearstcorporation.io?subject=Privacy%20Policy">
                  Privacy Policy
                </a>
              </div>
            </footer>
            </div>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
