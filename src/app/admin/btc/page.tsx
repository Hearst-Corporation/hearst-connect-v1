import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { ProductionMensuelleChart, type MoisProduction } from '@/components/admin/charts/btc-production-chart'
import { CalmState, Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { ReserveExpositionChart, type PosteBitcoin } from '@/components/admin/product-charts'
import { AdminCaption, AdminH3 } from '@/components/admin/typography'
import { callBackend } from '@/lib/backend/client'
import { LIBELLE_MOUVEMENT, motifLisible } from '@/lib/mouvements'
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bitcoin' }
export const dynamic = 'force-dynamic'

/**
 * Bitcoin — ce qui a été produit, à quelle cadence, où l'argent dort, ce qui
 * s'est passé.
 *
 * L'ancienne page déversait la réponse d'une route. Elle répondait donc à la
 * question « que renvoie le service ? », que personne ne se pose. Celle-ci en
 * pose quatre : combien de bitcoin le fonds a produit, à quel rythme il le
 * produit, comment son argent se partage entre réserve dormante et exposition
 * au marché, et ce qui mérite d'être su parmi les derniers événements.
 *
 * ── Ce qui a changé, et pourquoi ──────────────────────────────────────────
 * La cadence de production était l'un des cadres en attente : le service ne
 * transmettait qu'un cumul. Il expose désormais un relevé mensuel, la série
 * est donc tracée. Elle ne compte qu'un mois à ce jour : la page le DIT, au
 * lieu de laisser une barre isolée passer pour une tendance.
 *
 * ── Ce qui reste vide, et pourquoi ce n'est pas la même chose ─────────────
 * Trois vues restent sans donnée, et il faut distinguer deux silences très
 * différents :
 *   — attribution du rendement et paliers de prise de bénéfice : le contrat
 *     déployé n'expose aucune lecture de ces valeurs (`not_exposed_by_contract`).
 *     Ce n'est pas un retard de branchement, c'est une capacité absente de la
 *     source ; un nouveau déploiement du backend n'y changerait rien.
 *   — garde des avoirs : aucun dépositaire n'est intégré
 *     (`no_custody_provider_integrated`).
 * Et un troisième silence, encore différent : le registre des preuves répond,
 * et il est vide. Une table lue et vide n'est pas une source manquante — la
 * page le formule explicitement, sans quoi les deux se confondent à l'œil.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

/**
 * Forme réelle d'un événement `/api/v1/btc`, constatée sur le service.
 *
 * L'horodatage arrive sous `timestamp`, pas sous `occurredAt` — la version
 * précédente lisait le mauvais champ et affichait donc « — » sur chaque ligne.
 * Les deux noms sont acceptés ici : le second ne coûte rien et couvre une
 * divergence entre routes.
 */
type Evenement = {
  readonly name?: string | null
  readonly category?: string | null
  readonly severity?: string | null
  readonly timestamp?: string | null
  readonly occurredAt?: string | null
}

/** Relevé mensuel de production, en satoshis entiers transmis en chaîne. */
type MoisBrut = {
  readonly period?: string | null
  readonly satsEarned?: string | null
  readonly cumulativeSatsEarned?: string | null
}

type Production = {
  readonly monthly?: readonly MoisBrut[] | null
  readonly cumulativeSatsEarned?: string | null
  readonly cumulativeBtcEarned?: string | null
}

type Btc = {
  readonly reserve?: Resolu<{ balanceUsdc: string | null; balanceBtc: string | null }>
  readonly exposure?: Resolu<{ pouch: string | null; valueUsdc: string | null; targetBps: number | null; actualBps: number | null }>
  readonly btcProduced?: Resolu<{ totalSats: string | null; lastReportTime: string | null }>
  readonly takeProfitTiers?: Resolu<unknown>
  readonly events?: Resolu<readonly Evenement[]>
  readonly attribution?: Resolu<unknown>
  readonly production?: Resolu<Production>
  readonly custody?: Resolu<unknown>
  readonly proofs?: Resolu<readonly unknown[]>
}

const etatDe = etatSerieDe

function usdc(atomique: string | null | undefined, decimales = 0): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const n = Number(atomique)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

function montantUsdc(atomique: string | null | undefined): number | null {
  if (atomique === null || atomique === undefined || atomique === '') return null
  const n = Number(atomique)
  return Number.isFinite(n) ? n / 1_000_000 : null
}

function dateLisible(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

/** Une part se lit en pourcentage, jamais en points de base bruts. */
function partLisible(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

/* ── Satoshis ────────────────────────────────────────────────────────────── */

const ENTIER_DECIMAL = /^\d+$/
const PERIODE_MENSUELLE = /^(\d{4})-(\d{2})$/

/**
 * Satoshis → BTC, au satoshi près.
 *
 * Le service transmet un entier de satoshis en chaîne. Le diviser en virgule
 * flottante ferait dériver le huitième chiffre — exactement là où se lit un
 * montant en bitcoin. La conversion se fait donc sur la chaîne : partie
 * entière et huit décimales sortent telles quelles, sans arithmétique.
 * Une chaîne qui n'est pas un entier décimal rend `null` : illisible se dit,
 * ne se devine pas.
 */
function btcExactDepuisSats(sats: string | null | undefined): string | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  const rembourre = sats.padStart(9, '0')
  const entiere = Number(rembourre.slice(0, -8))
  return `${entiere.toLocaleString('fr-FR')},${rembourre.slice(-8)}`
}

/**
 * La même valeur en nombre, pour l'ÉCHELLE du graphique uniquement — jamais
 * pour un chiffre affiché, qui vient toujours de la chaîne d'origine.
 * L'émission totale de bitcoin plafonne à 2,1 × 10^15 satoshis, sous les 2^53
 * que `Number` représente exactement : la position d'une barre est juste.
 */
function btcNombreDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  return Number(sats) / 100_000_000
}

/** « 2026-07 » → « juil. 2026 ». Une période non reconnue est rendue telle quelle. */
function moisLisible(periode: string): string {
  const parts = PERIODE_MENSUELLE.exec(periode)
  if (parts === null) return periode
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1))
  if (Number.isNaN(date.getTime())) return periode
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Relevés bruts → mois exploitables. Un mois illisible est écarté, pas comblé. */
function moisExploitables(production: Production | null | undefined): MoisProduction[] {
  const releves = production?.monthly
  if (!Array.isArray(releves)) return []

  const retenus: MoisProduction[] = []
  for (const brut of releves) {
    const periode = brut?.period
    const btc = btcNombreDepuisSats(brut?.satsEarned)
    const exact = btcExactDepuisSats(brut?.satsEarned)
    if (typeof periode !== 'string' || periode === '' || btc === null || exact === null) continue
    retenus.push({
      periode,
      libelle: moisLisible(periode),
      btc,
      btcExact: exact,
      cumulExact: btcExactDepuisSats(brut?.cumulativeSatsEarned),
    })
  }
  // Le service rend les mois du plus ancien au plus récent ; on le garantit
  // plutôt que de le supposer, sans quoi l'axe raconterait le temps à l'envers.
  return retenus.sort((a, b) => a.periode.localeCompare(b.periode))
}

/**
 * Trois silences distincts, trois états distincts.
 *
 * « LIVE mais aucun mois » n'est pas « source absente » : dans le premier cas
 * la table a répondu, dans le second personne n'a répondu. Les confondre
 * reviendrait à annoncer une panne là où il n'y a qu'une absence d'historique.
 */
function etatProductionDe(bloc: ChampResolu | undefined, moisRetenus: number): EtatSerie {
  if (moisRetenus > 0) return { type: 'tracee' }
  if (bloc?.status === 'LIVE') {
    return {
      type: 'vide',
      explication:
        'Les relevés de production ont bien été consultés : aucun mois exploitable n’y figure encore. La série apparaîtra au premier relevé.',
    }
  }
  return etatDe(bloc, 'Les relevés mensuels de production ne sont pas encore transmis par le service.')
}

/** La gravité décide de la couleur ET du mot : un daltonien lit le même état. */
const GRAVITE: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  critical: { mot: 'Critique', point: 'bg-danger-500', texte: 'text-danger-400' },
  error: { mot: 'Anomalie', point: 'bg-danger-500', texte: 'text-danger-400' },
  warning: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400' },
  warn: { mot: 'À surveiller', point: 'bg-warning-500', texte: 'text-warning-400' },
  info: { mot: 'Pour information', point: 'bg-info-500', texte: 'text-info-400' },
  notice: { mot: 'Pour information', point: 'bg-info-500', texte: 'text-info-400' },
}

function graviteLisible(brut: string | null | undefined) {
  if (typeof brut !== 'string') return { mot: 'Non qualifié', point: 'bg-zinc-600', texte: 'text-zinc-400' }
  return GRAVITE[brut.toLowerCase()] ?? { mot: 'Non qualifié', point: 'bg-zinc-600', texte: 'text-zinc-400' }
}

/**
 * Le nom d'un mouvement vient du dictionnaire partagé — une seule source pour
 * toute la console, sinon deux écrans finissent par nommer différemment le
 * même événement.
 *
 * Le repli mérite d'être noté : les noms arrivent du contrat en PascalCase
 * anglais (`MiningMetricsReported`). Les aplatir en minuscules produirait
 * « Miningmetricsreported » — sorti du registre machine en apparence
 * seulement. Un nom inconnu du dictionnaire est donc découpé sur ses
 * majuscules, ce qui rend « Take Profit Executed » plutôt qu'une bouillie.
 */
function nomLisible(brut: string | null | undefined): string {
  if (typeof brut !== 'string' || brut === '') return 'Événement sans intitulé'
  const traduit = LIBELLE_MOUVEMENT[brut]
  if (traduit !== undefined) return traduit
  const decoupe = brut
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  return decoupe === '' ? 'Événement sans intitulé' : decoupe
}

function CeQuiSestPasse({ evenements, statutLive }: Readonly<{ evenements: readonly Evenement[]; statutLive: boolean }>) {
  if (evenements.length === 0) {
    return statutLive ? (
      <CalmState message="Aucun mouvement bitcoin n’a été enregistré. Rien ne demande d’attention." />
    ) : null
  }

  return (
    <Card>
      <CardHeader
        title="Que s’est-il passé récemment ?"
        hint="Les mouvements et alertes remontés par le service, du plus récent au plus ancien"
      />
      <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
        {evenements.map((e, index) => {
          const gravite = graviteLisible(e.severity)
          return (
            <li
              key={`${e.name ?? 'evenement'}-${e.timestamp ?? e.occurredAt ?? String(index)}`}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3.5 text-sm"
            >
              <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-1px] rounded-full', gravite.point)} />
              <span className="min-w-0 flex-1 text-white">{nomLisible(e.name)}</span>
              {e.category === null || e.category === undefined || e.category === '' ? null : (
                <span className="text-xs text-zinc-500">{nomLisible(e.category)}</span>
              )}
              <span className={clsx('text-xs font-medium', gravite.texte)}>{gravite.mot}</span>
              {/* Le service porte aussi un `amount` sur certains mouvements. Il
                  n'est PAS rendu ici : le contrat ne dit pas dans quelle unité
                  il est libellé, et afficher « 60 000 $ » sur un montant qui
                  pourrait être en satoshis serait une invention à trois ordres
                  de grandeur près. Le montant reste consultable dans la
                  réponse brute, en bas de page. */}
              <span className="text-xs text-zinc-500 tabular-nums">{dateLisible(e.timestamp ?? e.occurredAt)}</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/* ── Registre des preuves ────────────────────────────────────────────────── */

/**
 * Le silence le plus facile à mal lire.
 *
 * `proofs` répond LIVE avec un tableau vide. « La table a été consultée et
 * elle est vide » et « aucune source ne répond » se ressemblent à l'écran et
 * n'ont rien à voir : la première est un fait sur le produit, la seconde un
 * incident. La phrase les sépare explicitement.
 */
function phrasePreuves(bloc: Resolu<readonly unknown[]>): string {
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    const motif = motifLisible(bloc.reason)
    if (motif === undefined) return 'Le registre des preuves n’a pas pu être consulté.'
    return `Le registre des preuves n’a pas pu être consulté : ${motif}.`
  }
  if (bloc.value.length === 0) {
    return 'Le registre a été consulté et il est vide : aucune preuve n’a encore été publiée. Ce n’est pas une source manquante — la table répond, elle n’a simplement rien à montrer pour l’instant.'
  }
  const nombre = bloc.value.length
  const accord = nombre > 1 ? 'preuves sont enregistrées' : 'preuve est enregistrée'
  return `${nombre} ${accord} au registre.`
}

function PreuvesPubliees({ bloc }: Readonly<{ bloc: Resolu<readonly unknown[]> | undefined }>) {
  if (bloc === undefined) return null

  return (
    <Card>
      <CardHeader
        title="Quelles preuves de production ont été publiées ?"
        hint="Registre des preuves rattachées au bitcoin produit"
      />
      <div className="px-5 py-4 sm:px-6">
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">{phrasePreuves(bloc)}</p>
        {/* Aucun tableau de colonnes n'est dessiné tant que le registre est
            vide : la forme d'une preuve n'a jamais été observée, et inventer
            des en-têtes reviendrait à publier un schéma que personne n'a
            constaté. Le jour où une preuve existe, ses champs se lisent. */}
      </div>
    </Card>
  )
}

export default async function Page() {
  const reponse = await callBackend<Btc>('btc')
  const b = reponse.ok ? reponse.data : null

  const reserve = b?.reserve?.value
  const exposition = b?.exposure?.value
  const produit = b?.btcProduced?.value

  const sats = produit?.totalSats
  const satsNombre = sats === null || sats === undefined ? null : Number(sats)
  const bitcoinProduit =
    satsNombre === null || !Number.isFinite(satsNombre)
      ? '—'
      : (satsNombre / 100_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 8 })

  // Réserve et exposition : deux montants réels, comparables sur une même
  // échelle. Un poste illisible est écarté, jamais ramené à zéro.
  const montantReserve = montantUsdc(reserve?.balanceUsdc)
  const montantExposition = montantUsdc(exposition?.valueUsdc)
  const postes: PosteBitcoin[] = []
  if (montantReserve !== null) postes.push({ poste: 'Réserve', montant: montantReserve, accent: false })
  if (montantExposition !== null) postes.push({ poste: 'Exposition', montant: montantExposition, accent: true })

  const evenements = b?.events?.value
  const listeEvenements = evenements ?? []

  // Cadence de production : le service expose désormais un relevé mensuel.
  // Chaque mois est une quantité mesurée ; aucun n'est comblé ni interpolé.
  const production = b?.production?.value
  const moisProduction = moisExploitables(production)
  const cumulProduction = btcExactDepuisSats(production?.cumulativeSatsEarned)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bitcoin"
        description="Ce que le fonds a produit en bitcoin, comment son argent se partage entre réserve et exposition, et ce qui s’est passé récemment."
      />

      <CockpitSection>

      {b === null ? (
        <SourceAttendue
          quoi="L’état bitcoin n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur périmée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          {/* ── Ce que le fonds a produit ─────────────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure valeur={bitcoinProduit} libelle="Bitcoin produit à ce jour" unite="BTC" />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <SideFact libelle="Réserve dormante" valeur={usdc(reserve?.balanceUsdc)} />
                <SideFact libelle="Valeur exposée au marché" valeur={usdc(exposition?.valueUsdc)} />
                <SideFact libelle="Dernier relevé de production" valeur={dateLisible(produit?.lastReportTime)} />
              </dl>
            </div>
          </Card>

          {/* ── À quelle cadence le bitcoin est produit ────────────────────── */}
          <ChartFrame
            question="À quelle cadence le bitcoin est-il produit ?"
            unite="en bitcoin, par mois relevé"
            etat={etatProductionDe(b.production, moisProduction.length)}
            hauteur="h-40"
          >
            <ProductionMensuelleChart mois={moisProduction} cumulBtc={cumulProduction} />
          </ChartFrame>

          {/* ── Où l'argent se trouve ─────────────────────────────────────── */}
          <ChartFrame
            question="Où l’argent se trouve-t-il ?"
            unite="en dollars"
            etat={
              postes.length > 0
                ? { type: 'tracee' }
                : {
                    type: 'attendue',
                    explication:
                      'Ni la réserve ni la valeur exposée n’ont pu être lues sur la chaîne. Rien n’est tracé plutôt qu’une répartition à zéro.',
                  }
            }
            hauteur="h-44"
          >
            <ReserveExpositionChart postes={postes} />
          </ChartFrame>

          {/* ── La poche exposée tient-elle sa cible ? ────────────────────── */}
          {exposition === null || exposition === undefined ? null : (
            <Card>
              <CardHeader
                title="La part exposée respecte-t-elle sa cible ?"
                hint="Comparaison entre la part visée par le contrat et celle constatée sur la chaîne"
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Poche exposée</span>
                  <span className="text-zinc-950 dark:text-white">
                    {exposition.pouch === null || exposition.pouch === undefined || exposition.pouch === ''
                      ? 'Non communiquée'
                      : exposition.pouch}
                  </span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Part visée</span>
                  <span className="text-zinc-950 tabular-nums dark:text-white">{partLisible(exposition.targetBps)}</span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">Part constatée</span>
                  <span className="text-zinc-950 tabular-nums dark:text-white">{partLisible(exposition.actualBps)}</span>
                </li>
              </ul>
            </Card>
          )}

          {/* ── Ce qui s'est passé ────────────────────────────────────────── */}
          <CeQuiSestPasse evenements={listeEvenements} statutLive={b.events?.status === 'LIVE'} />

          {/* ── Ce que la source n'expose pas ─────────────────────────────── */}
          <PreuvesPubliees bloc={b.proofs} />

          {/* Sans cette introduction, « En attente de la source » se lirait
              comme « ça arrive bientôt ». Ces trois lectures n'arrivent pas :
              elles n'existent pas dans le contrat déployé. Le dire une fois en
              tête de bloc évite de le répéter dans chaque cadre. */}
          <div className="space-y-1 pt-2">
            <AdminH3 as="h2">Ce que la source n’expose pas</AdminH3>
            <AdminCaption>
              Ces trois vues sont dessinées et prêtes. Elles restent sans série non par incident, mais parce que la
              lecture correspondante n’existe pas dans la source : le motif exact est rappelé sous chacune. Le jour où
              le contrat l’expose, la série remplace la phrase et la mise en page ne bouge pas.
            </AdminCaption>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ChartFrame
              question="D’où vient le rendement du bitcoin ?"
              unite="en pourcentage du total"
              etat={etatDe(b.attribution, 'Le contrat n’expose aucune décomposition du rendement bitcoin.')}
              hauteur="h-40"
            />
            <ChartFrame
              question="Où les bitcoins sont-ils conservés ?"
              unite="en bitcoin, par lieu de conservation"
              etat={etatDe(
                b.custody,
                'Aucun dépositaire n’est intégré : aucun lieu de conservation n’est déclaré à ce jour.',
              )}
              hauteur="h-40"
            />
            <ChartFrame
              question="À quels prix les bénéfices sont-ils pris ?"
              unite="en dollars, par palier"
              etat={etatDe(b.takeProfitTiers, 'Le contrat n’expose aucun palier de prise de bénéfice.')}
              hauteur="h-40"
            />
          </div>
        </>
      )}

      {/* La réponse brute reste consultable en bas de page, pour qui veut
          vérifier un champ que la lecture métier n'expose pas. */}
      </CockpitSection>
    </div>
  )
}
