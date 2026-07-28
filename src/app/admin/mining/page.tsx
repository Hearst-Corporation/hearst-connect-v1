import { MiningProductionChart, type MoisProduit } from '@/components/admin/charts/mining-production-chart'
import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import { adresseCourte, dateLisible, ilYA, libelleMouvement, montantUsdc } from '@/lib/mouvements'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Minage' }
export const dynamic = 'force-dynamic'

/**
 * Minage — la production paie-t-elle la facture ?
 *
 * L'écran précédent posait trois blocs adossés à trois routes : puissance,
 * bitcoin, électricité. Chacun était juste, l'ensemble ne disait rien. Le
 * minage n'a qu'une question, et elle relie les trois : ce que la flotte
 * produit vaut-il ce qu'elle consomme.
 *
 * ── Ce que la console calcule, et ce qu'elle refuse de conclure ────────────
 * Deux valeurs sont mesurées et publiées : le bitcoin attesté pour le mois
 * (contrat, via l'agrégat BTC) et la facture mensuelle d'électricité (contrat).
 * Leur quotient est un SEUIL — le prix du bitcoin à partir duquel le mois est
 * couvert. C'est une division de deux mesures, pas une hypothèse.
 *
 * Ce que la console ne fait PAS : dire si le seuil est franchi. Il faudrait
 * pour cela le prix du bitcoin, que le service n'expose sur aucune route. Le
 * backend ingère pourtant une table de marché (hashprice, prix du bitcoin,
 * difficulté) — vérifié ce jour, aucun champ ne la publie en HTTP. Le cadre du
 * graphique de rentabilité reste donc posé, et nomme ce qui manque.
 *
 * ── Pourquoi trois routes pour une page ───────────────────────────────────
 * `mining` donne l'état instantané (puissance, facture, exploitation), `btc`
 * la seule série temporelle réelle de la production, `series1-events` la
 * chronologie des attestations. La page suit la question, pas le découpage du
 * service.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Releve = {
  readonly reportedHashrateTh?: string | null
  readonly totalBtcEarnedSats?: string | null
  readonly lastReportTime?: string | null
}

type Electricite = {
  readonly monthlyCost?: string | null
  readonly payee?: string | null
  readonly totalPaid?: string | null
  readonly lastPayment?: string | null
  readonly nextEligiblePayment?: string | null
  readonly canPay?: boolean | null
}

type Exploitation = {
  readonly currentMonth?: number | null
  readonly productDurationMonths?: number | null
  readonly fleetActive?: boolean | null
  readonly curtailed?: boolean | null
}

type Chaine = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
}

type Minage = {
  readonly runtime?: Chaine
  readonly hashrate?: Resolu<Releve>
  readonly btcEarned?: Resolu<Releve>
  readonly electricity?: Resolu<Electricite>
  readonly curtailment?: Resolu<Exploitation>
  readonly engine?: Resolu<Exploitation>
  readonly operationalTelemetry?: Resolu<unknown>
}

type MoisBackend = {
  readonly period?: string | null
  readonly satsEarned?: string | null
  readonly cumulativeSatsEarned?: string | null
}

type Production = {
  readonly monthly?: readonly MoisBackend[] | null
  readonly cumulativeSatsEarned?: string | null
  readonly cumulativeBtcEarned?: string | null
}

type Btc = { readonly production?: Resolu<Production> }

type Mouvement = {
  readonly id?: string | null
  readonly eventName?: string | null
  readonly occurredAt?: string | null
  readonly assetAmountAtomic?: string | null
  readonly txHash?: string | null
}

type Series1 = { readonly events?: Resolu<readonly Mouvement[]> }

/**
 * Motifs propres au minage. `no_telemetry_rows` mérite sa phrase : ce n'est pas
 * une source absente, c'est une table branchée qui n'a encore reçu aucune ligne.
 * La nuance décide de ce qu'on demande à l'exploitant.
 */
const MOTIFS_MINAGE: Record<string, string> = {
  ...MOTIF_SERIE,
  no_telemetry_rows: 'la table de télémétrie est branchée, et aucun relevé n’y a encore été enregistré',
}

/* ── Conversions ─────────────────────────────────────────────────────────── */

/** Satoshis entiers → bitcoin. Une valeur absente rend `null`, jamais zéro. */
function btcDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || sats === '') return null
  const brut = Number(sats)
  return Number.isFinite(brut) ? brut / 100_000_000 : null
}

/** USDC atomique (6 décimales) → dollars. Absent : `null`. */
function dollarsDepuisAtomique(atomique: string | null | undefined): number | null {
  if (typeof atomique !== 'string' || atomique === '') return null
  const brut = Number(atomique)
  return Number.isFinite(brut) ? brut / 1_000_000 : null
}

function btcLisible(valeur: number | null): string {
  if (valeur === null) return '—'
  return `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 8 })} BTC`
}

function dollarsLisibles(valeur: number | null): string {
  if (valeur === null) return '—'
  return `${valeur.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $`
}

/** « 2026-07 » → « juillet 2026 ». Une période illisible est rendue telle quelle. */
function periodeLisible(periode: string | null | undefined): string {
  if (typeof periode !== 'string' || periode === '') return 'période inconnue'
  const instant = Date.parse(`${periode}-01T00:00:00Z`)
  if (Number.isNaN(instant)) return periode
  return new Date(instant).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function texteBooleen(valeur: boolean | null | undefined, siVrai: string, siFaux: string): string {
  if (valeur === true) return siVrai
  if (valeur === false) return siFaux
  return 'Non communiqué'
}

/**
 * Seuil de couverture — le prix du bitcoin à partir duquel la production d'un
 * mois paie l'électricité de ce mois. Deux mesures, une division.
 *
 * Une production nulle ou absente ne rend pas « l'infini » : elle rend `null`,
 * et l'écran affiche « — ». Un seuil infini se lirait comme une alerte, alors
 * qu'il ne signifierait qu'une absence de mesure.
 */
function seuilCouverture(btcDuMois: number | null, factureDollars: number | null): number | null {
  if (btcDuMois === null || factureDollars === null) return null
  if (btcDuMois <= 0) return null
  return factureDollars / btcDuMois
}

/* ── Fragments d'écran ───────────────────────────────────────────────────── */

const TON_POINT: Record<'sain' | 'attention' | 'neutre', string> = {
  sain: 'bg-success-500',
  attention: 'bg-warning-500',
  neutre: 'bg-zinc-500',
}

/**
 * Une ligne d'état porte toujours le MOT en clair. La pastille ne fait que
 * répéter ce que la phrase dit déjà : lue en noir et blanc, la ligne reste
 * complète.
 */
function LigneEtat({
  libelle,
  valeur,
  ton,
}: Readonly<{ libelle: string; valeur: string; ton: 'sain' | 'attention' | 'neutre' }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 text-sm sm:px-6">
      <span className="w-32 shrink-0 text-zinc-500 dark:text-zinc-400">{libelle}</span>
      <span className="flex min-w-0 items-baseline gap-2 text-zinc-950 dark:text-white">
        <span aria-hidden="true" className={clsx('size-1.5 shrink-0 translate-y-[-2px] rounded-full', TON_POINT[ton])} />
        {valeur}
      </span>
    </li>
  )
}

/** Chronologie des attestations : ce que le contrat a réellement déclaré, quand. */
function Attestations({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  if (mouvements.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-zinc-500 sm:px-6 dark:text-zinc-400">
        Aucune attestation de minage n’a encore été relevée sur la chaîne.
      </p>
    )
  }

  return (
    <ol className="divide-y divide-zinc-950/5 dark:divide-white/5">
      {mouvements.map((mouvement, rang) => {
        const montant = montantUsdc(mouvement.assetAmountAtomic)
        return (
          <li
            key={mouvement.id ?? mouvement.txHash ?? `attestation-${rang}`}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm sm:px-6"
          >
            <span className="min-w-0 text-zinc-950 dark:text-white">
              {libelleMouvement(mouvement.eventName ?? 'Mouvement sans intitulé')}
              {montant === '—' ? null : <span className="ml-2 text-zinc-500 tabular-nums dark:text-zinc-400">{montant}</span>}
            </span>
            <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {dateLisible(mouvement.occurredAt)} · {ilYA(mouvement.occurredAt)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

/** Seuls ces mouvements racontent l'exploitation minière. Le reste est ailleurs. */
const MOUVEMENTS_MINAGE = new Set([
  'MiningMetricsReported',
  'ElectricityPaid',
  'MonthlyElecCostUpdated',
  'ElecPayeeUpdated',
  'CurtailmentTriggered',
  'CurtailmentLifted',
])

export default async function Page() {
  // Trois appels en parallèle : la page ne se lit qu'une fois les trois arrivés,
  // les enchaîner ne ferait qu'additionner leurs latences.
  //
  // Aucun `limit` n'est passé aux événements : `params` ne sert qu'à substituer
  // les segments de chemin du registre, il ne construit pas de query string.
  // Le fournir donnerait l'illusion d'une pagination maîtrisée alors que le
  // service appliquerait sa propre borne. Le tri se fait donc ici.
  const [reponseMinage, reponseBtc, reponseMouvements] = await Promise.all([
    callBackend<Minage>('mining'),
    callBackend<Btc>('btc'),
    callBackend<Series1>('series1-events'),
  ])

  const minage = reponseMinage.ok ? reponseMinage.data : null
  const production = reponseBtc.ok ? reponseBtc.data.production : undefined

  const releve = minage?.hashrate?.value
  const sats = minage?.btcEarned?.value?.totalBtcEarnedSats ?? releve?.totalBtcEarnedSats
  const electricite = minage?.electricity?.value
  const exploitation = minage?.curtailment?.value ?? minage?.engine?.value
  const chaine = minage?.runtime

  const cumulBtc = btcDepuisSats(sats)
  const factureMensuelle = dollarsDepuisAtomique(electricite?.monthlyCost)
  const totalRegle = dollarsDepuisAtomique(electricite?.totalPaid)

  // Série de production : le backend l'agrège par mois, la page ne fait que la
  // convertir et la mettre en forme. Aucun mois n'est complété ni interpolé —
  // un trou dans la série est un trou dans les relevés, il doit se voir.
  const moisBruts = production?.value?.monthly ?? []
  const moisProduits: MoisProduit[] = moisBruts.flatMap((mois) => {
    const btc = btcDepuisSats(mois.satsEarned)
    if (btc === null) return []
    return [{ libelle: periodeLisible(mois.period), btc }]
  })
  const dernierMois = moisProduits.at(-1)
  const seuil = seuilCouverture(dernierMois?.btc ?? null, factureMensuelle)

  const mouvements = reponseMouvements.ok ? (reponseMouvements.data.events?.value ?? []) : []
  const attestations = mouvements
    .filter((mouvement) => typeof mouvement.eventName === 'string' && MOUVEMENTS_MINAGE.has(mouvement.eventName))
    .slice(0, 8)

  const adresseContrat = adresseCourte(chaine?.contractAddress)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Minage"
        description="Ce que la flotte produit vaut-il ce qu’elle consomme ?"
      />

      {minage === null ? (
        <CockpitSection>
          <SourceAttendue
            quoi="L’état du minage n’a pas pu être lu"
            detail="Le service n’a pas répondu. Aucune valeur n’est supposée."
            requis={['Une réponse du service']}
          />
        </CockpitSection>
      ) : (
        <>
          {/* ── 01 · L'équation économique ─────────────────────────────────── */}
          <CockpitSection
            index="01"
            title="Production contre facture"
            description="La seule question du minage : le bitcoin produit sur un mois paie-t-il l’électricité de ce mois."
          >
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={dollarsLisibles(seuil)}
                  libelle="Prix du bitcoin qui couvre le mois"
                  unite="$ / BTC"
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <SideFact
                    libelle={dernierMois === undefined ? 'Mois relevé' : `Produit en ${dernierMois.libelle}`}
                    valeur={btcLisible(dernierMois?.btc ?? null)}
                  />
                  <SideFact libelle="Facture mensuelle" valeur={dollarsLisibles(factureMensuelle)} />
                  <SideFact libelle="Total réglé à ce jour" valeur={dollarsLisibles(totalRegle)} />
                </dl>
              </div>
              {/* La limite du calcul est écrite à côté du chiffre, pas en note de
                  bas de page : un seuil sans son « on ne sait pas s'il est
                  franchi » se lirait comme un verdict de rentabilité. */}
              <p className="mt-6 max-w-2xl border-t border-zinc-950/5 pt-4 text-sm text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                Ce seuil est le quotient de deux mesures : le bitcoin attesté par le contrat pour le mois, et la
                facture mensuelle d’électricité. La console s’arrête là — le prix réel du bitcoin n’est publié par
                aucune route du service, elle ne dit donc pas si le seuil est franchi.
              </p>
            </Card>

            <ChartFrame
              question="Combien la flotte produit-elle, mois après mois ?"
              unite="en bitcoin, par mois d’exploitation"
              etat={etatSerieDe(
                production,
                'La production mensuelle n’est pas encore agrégée par le service.',
                MOTIFS_MINAGE,
              )}
            >
              <MiningProductionChart mois={moisProduits} />
              {moisProduits.length === 1 ? (
                <p className="border-t border-zinc-950/5 px-6 py-3 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                  Un seul mois est relevé à ce jour : la barre unique est l’étendue exacte de l’historique, pas un
                  défaut d’affichage. La série s’allongera d’un mois à chaque cycle.
                </p>
              ) : null}
            </ChartFrame>

            <ChartFrame
              question="Le minage est-il rentable au prix du marché ?"
              unite="en dollars par térahash et par jour"
              etat={{
                type: 'attendue',
                explication:
                  'Le service ingère bien ces relevés de marché, et aucune route ne les publie : l’agrégat minage ne renvoie que puissance, bitcoin, électricité et exploitation. Sans hashprice ni prix du bitcoin, le seuil ci-dessus reste un seuil.',
              }}
              hauteur="h-44"
            />
          </CockpitSection>

          {/* ── 02 · La flotte ─────────────────────────────────────────────── */}
          <CockpitSection
            index="02"
            title="La flotte"
            description="Ce que le contrat déclare de la puissance installée et de son régime de marche."
          >
            <Card className="p-6">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={
                    typeof releve?.reportedHashrateTh === 'string' && releve.reportedHashrateTh !== ''
                      ? Number(releve.reportedHashrateTh).toLocaleString('fr-FR')
                      : '—'
                  }
                  libelle="Puissance de calcul déclarée"
                  unite="TH/s"
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <SideFact libelle="Bitcoin produit depuis l’origine" valeur={btcLisible(cumulBtc)} />
                  <SideFact libelle="Dernier relevé" valeur={dateLisible(releve?.lastReportTime)} />
                  <SideFact libelle="Ancienneté du relevé" valeur={ilYA(releve?.lastReportTime)} />
                </dl>
              </div>
            </Card>

            <Card>
              <CardHeader title="La flotte tourne-t-elle ?" hint="Régime d’exploitation déclaré par le contrat" />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <LigneEtat
                  libelle="Flotte"
                  valeur={texteBooleen(exploitation?.fleetActive, 'En fonctionnement', 'À l’arrêt')}
                  ton={exploitation?.fleetActive === true ? 'sain' : 'attention'}
                />
                <LigneEtat
                  libelle="Bridage"
                  valeur={texteBooleen(
                    exploitation?.curtailed,
                    'Actif — la production est volontairement réduite',
                    'Inactif',
                  )}
                  ton={exploitation?.curtailed === true ? 'attention' : 'sain'}
                />
              </ul>
              {adresseContrat === null ? null : (
                <p className="border-t border-zinc-950/5 px-5 py-3 text-xs text-zinc-500 sm:px-6 dark:border-white/5 dark:text-zinc-400">
                  Déclaré par le contrat {adresseContrat}
                  {typeof chaine?.mode === 'string' && chaine.mode !== '' ? ` · mode ${chaine.mode}` : null}
                </p>
              )}
            </Card>

            <ChartFrame
              question="Comment la flotte se comporte-t-elle au jour le jour ?"
              unite="en térahash par seconde, par relevé"
              etat={etatSerieDe(
                minage.operationalTelemetry,
                'La télémétrie d’exploitation n’est pas encore alimentée.',
                MOTIFS_MINAGE,
              )}
              hauteur="h-44"
            />
          </CockpitSection>

          {/* ── 03 · Électricité ───────────────────────────────────────────── */}
          <CockpitSection
            index="03"
            title="Électricité"
            description="Le poste de coût du minage : ce qui est dû, ce qui a été réglé, et à qui."
          >
            <Card>
              <CardHeader title="Où en est le règlement ?" hint="Poste électricité lu sur le contrat" />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                <LigneEtat libelle="Facture du mois" valeur={dollarsLisibles(factureMensuelle)} ton="neutre" />
                <LigneEtat libelle="Total réglé" valeur={dollarsLisibles(totalRegle)} ton="neutre" />
                <LigneEtat libelle="Dernier paiement" valeur={dateLisible(electricite?.lastPayment)} ton="neutre" />
                <LigneEtat
                  libelle="Paiement ouvert"
                  valeur={texteBooleen(
                    electricite?.canPay,
                    'Oui — un règlement peut être déclenché',
                    'Non — aucun règlement n’est dû pour l’instant',
                  )}
                  ton={electricite?.canPay === true ? 'attention' : 'sain'}
                />
                <LigneEtat
                  libelle="Prochaine échéance"
                  valeur={
                    typeof electricite?.nextEligiblePayment === 'string' && electricite.nextEligiblePayment !== ''
                      ? dateLisible(electricite.nextEligiblePayment)
                      : 'Aucune date d’éligibilité communiquée'
                  }
                  ton="neutre"
                />
                <LigneEtat
                  libelle="Bénéficiaire"
                  valeur={adresseCourte(electricite?.payee) ?? 'Non communiqué'}
                  ton="neutre"
                />
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Ce que le contrat a attesté"
                hint="Relevés de minage et mouvements d’électricité, du plus récent au plus ancien"
              />
              <Attestations mouvements={attestations} />
            </Card>
          </CockpitSection>
        </>
      )}
    </div>
  )
}
