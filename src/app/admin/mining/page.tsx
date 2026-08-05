import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { adresseCourte, dateLisible, ilYA, libelleMouvement, montantUsdc } from '@/lib/mouvements'
import { formatCurrency, formatNumber } from '@/lib/format'
import {
  etiquetteChampResolu,
  reconcilierFactureMensuelle,
  reconcilierHashrate,
} from '@/lib/mining/dedicated-reads'
import { MOTIF_SERIE, etatSerieDe } from '@/lib/serie-etat'
import { editorial, mapAvailability, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mining' }
export const dynamic = 'force-dynamic'

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

type MinageOnchain = {
  readonly hashrate?: Resolu<Releve>
  readonly btcEarned?: Resolu<Releve>
}

type MinageElectricite = {
  readonly electricity?: Resolu<Electricite>
}

type MoisProduit = { readonly libelle: string; readonly btc: number }

const MOTIFS_MINAGE: Record<string, string> = {
  ...MOTIF_SERIE,
  no_telemetry_rows: 'la table de télémétrie est raccordée, et aucune lecture n’y a encore été enregistrée',
}

const MOUVEMENTS_MINAGE = new Set([
  'MiningMetricsReported',
  'ElectricityPaid',
  'MonthlyElecCostUpdated',
  'ElecPayeeUpdated',
  'CurtailmentTriggered',
  'CurtailmentLifted',
])

function btcDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || sats === '') return null
  const brut = Number(sats)
  return Number.isFinite(brut) ? brut / 100_000_000 : null
}

function dollarsDepuisAtomique(atomique: string | null | undefined): number | null {
  if (typeof atomique !== 'string' || atomique === '') return null
  const brut = Number(atomique)
  return Number.isFinite(brut) ? brut / 1_000_000 : null
}

function btcLisible(valeur: number | null): string {
  if (valeur === null) return '—'
  return `${formatNumber(valeur, { maximumFractionDigits: 8 })} BTC`
}

function dollarsLisibles(valeur: number | null): string {
  return formatCurrency(valeur, { decimals: 0, fromAtomic: 1 })
}

function periodeLisible(periode: string | null | undefined): string {
  if (typeof periode !== 'string' || periode === '') return 'période inconnue'
  const instant = Date.parse(`${periode}-01T00:00:00Z`)
  if (Number.isNaN(instant)) return periode
  return new Date(instant).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function texteBooleen(valeur: boolean | null | undefined, siVrai: string, siFaux: string): string {
  if (valeur === true) return siVrai
  if (valeur === false) return siFaux
  return 'Non communiqué'
}

function seuilCouverture(btcDuMois: number | null, factureDollars: number | null): number | null {
  if (btcDuMois === null || factureDollars === null) return null
  if (btcDuMois <= 0) return null
  return factureDollars / btcDuMois
}

function moisProduitsDe(production: Production | null | undefined): MoisProduit[] {
  const bruts = production?.monthly
  if (!Array.isArray(bruts)) return []
  const retenus: MoisProduit[] = []
  for (const mois of bruts) {
    const btc = btcDepuisSats(mois.satsEarned)
    if (btc === null) continue
    retenus.push({ libelle: periodeLisible(mois.period), btc })
  }
  return retenus.sort((a, b) => a.libelle.localeCompare(b.libelle))
}

function attestationsMinage(mouvements: readonly Mouvement[]): readonly Mouvement[] {
  return mouvements
    .filter((mouvement) => typeof mouvement.eventName === 'string' && MOUVEMENTS_MINAGE.has(mouvement.eventName))
    .slice(0, 8)
}

function hashrateLisible(releve: Releve | null | undefined): string {
  if (typeof releve?.reportedHashrateTh !== 'string' || releve.reportedHashrateTh === '') return '—'
  return formatNumber(Number(releve.reportedHashrateTh))
}

function prochaineEcheance(electricite: Electricite | null | undefined): string {
  if (typeof electricite?.nextEligiblePayment !== 'string' || electricite.nextEligiblePayment === '') {
    return 'Aucune date d’éligibilité communiquée'
  }
  return dateLisible(electricite.nextEligiblePayment)
}

function phraseProductionMensuelle(
  bloc: Resolu<Production> | undefined,
  moisRetenus: number,
): string {
  if (moisRetenus > 0) return 'Historique de production mensuelle.'
  const etat = etatSerieDe(bloc, 'La production mensuelle n’est pas encore agrégée par le service.', MOTIFS_MINAGE)
  if (etat.type === 'vide') return etat.explication
  if (etat.type === 'attendue' || etat.type === 'indisponible') return etat.explication
  return 'L’historique de production a été interrogé avec succès et ne contient encore aucun mois.'
}

function phraseTelemetry(telemetry: Resolu<unknown> | undefined): string {
  const etat = etatSerieDe(telemetry, 'La télémétrie d’exploitation n’est pas encore alimentée.', MOTIFS_MINAGE)
  if (etat.type === 'attendue' || etat.type === 'indisponible' || etat.type === 'vide') return etat.explication
  return 'La télémétrie d’exploitation n’est pas encore alimentée.'
}

type ResumeMinage = Readonly<{
  releve: Releve | null | undefined
  electricite: Electricite | null | undefined
  exploitation: Exploitation | null | undefined
  chaine: Chaine | null | undefined
  cumulBtc: number | null
  factureMensuelle: number | null
  totalRegle: number | null
  seuil: number | null
  dernierMois: MoisProduit | undefined
  moisProduits: readonly MoisProduit[]
  attestations: readonly Mouvement[]
  adresseContrat: string | null
}>

function resumeMinage(
  minage: Minage | null,
  production: Resolu<Production> | undefined,
  mouvements: readonly Mouvement[],
): ResumeMinage {
  const releve = minage?.hashrate?.value ?? minage?.btcEarned?.value
  const sats = minage?.btcEarned?.value?.totalBtcEarnedSats ?? releve?.totalBtcEarnedSats
  const electricite = minage?.electricity?.value
  const exploitation = minage?.curtailment?.value ?? minage?.engine?.value
  const chaine = minage?.runtime
  const moisProduits = moisProduitsDe(production?.value)
  const dernierMois = moisProduits.at(-1)

  return {
    releve,
    electricite,
    exploitation,
    chaine,
    cumulBtc: btcDepuisSats(sats),
    factureMensuelle: dollarsDepuisAtomique(electricite?.monthlyCost),
    totalRegle: dollarsDepuisAtomique(electricite?.totalPaid),
    seuil: seuilCouverture(dernierMois?.btc ?? null, dollarsDepuisAtomique(electricite?.monthlyCost)),
    dernierMois,
    moisProduits,
    attestations: attestationsMinage(mouvements),
    adresseContrat: adresseCourte(chaine?.contractAddress),
  }
}

/**
 * Mining — Catalyst pur.
 * Sources : mining, btc, series1-events.
 */
export default async function Page() {
  await requireSession()

  const [reponseMinage, reponseBtc, reponseMouvements, reponseOnchain, reponseElectricite] = await Promise.all([
    callBackend<Minage>('mining'),
    callBackend<Btc>('btc'),
    callBackend<Series1>('series1-events'),
    callBackend<MinageOnchain>('mining-onchain'),
    callBackend<MinageElectricite>('mining-electricity'),
  ])

  const minage = reponseMinage.ok ? reponseMinage.data : null
  const production = reponseBtc.ok ? reponseBtc.data.production : undefined
  const mouvements = reponseMouvements.ok ? (reponseMouvements.data.events?.value ?? []) : []
  const resume = resumeMinage(minage, production, mouvements)

  const miningFigure = (value: string): Availability<string> =>
    reponseMinage.ok
      ? editorial(value)
      : unavailable({ endpoint: '/api/v1/mining', status: 'UNAVAILABLE', reason: 'mining_source_unreachable' })
  const btcFigure = (value: string): Availability<string> =>
    reponseBtc.ok
      ? editorial(value)
      : unavailable({ endpoint: '/api/v1/btc', status: 'UNAVAILABLE', reason: 'btc_source_unreachable' })
  const eventsAvail = availabilityFromResolu<readonly Mouvement[]>(
    reponseMouvements.ok ? reponseMouvements.data.events : undefined,
    '/api/v1/series1/events',
  )
  const attestationsCell = mapAvailability(eventsAvail, () => String(resume.attestations.length))

  const hashrateAgregat = minage?.hashrate
  const hashrateOnchain = reponseOnchain.ok ? reponseOnchain.data.hashrate : undefined
  const electriciteAgregat = minage?.electricity
  const electriciteDediee = reponseElectricite.ok ? reponseElectricite.data.electricity : undefined

  const titreMois =
    resume.dernierMois === undefined ? 'Mois rapporté' : `Produit en ${resume.dernierMois.libelle}`

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Mining"
        description="La question du minage : le bitcoin produit dans un mois paie-t-il l’électricité de ce mois. Aucune inférence du prix de marché."
      />

      <DescriptionList>
        <DescriptionTerm>Hashrate</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={miningFigure(hashrateLisible(resume.releve))} />
        </DescriptionDetails>
        <DescriptionTerm>BTC produit</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={btcFigure(btcLisible(resume.cumulBtc))} />
        </DescriptionDetails>
        <DescriptionTerm>Facture mensuelle</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={miningFigure(dollarsLisibles(resume.factureMensuelle))} />
        </DescriptionDetails>
        <DescriptionTerm>Attestations</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={attestationsCell} />
        </DescriptionDetails>
        <DescriptionTerm>Seuil de couverture</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(dollarsLisibles(resume.seuil))} />
        </DescriptionDetails>
        <DescriptionTerm>Source minage</DescriptionTerm>
        <DescriptionDetails>{minage === null ? 'Indisponible' : 'Disponible'}</DescriptionDetails>
      </DescriptionList>

      {minage === null ? (
        <Text>
          L’état du minage n’a pas pu être lu. Le service n’a pas répondu — aucune valeur n’est supposée.
        </Text>
      ) : (
        <>
          <AdminSectionHeading
            title="Production face à la facture"
            description="Seuil = facture mensuelle / BTC produit dans le mois. La console s’arrête là — le prix réel du bitcoin n’est publié par aucune route."
          />
          <DescriptionList>
            <DescriptionTerm>Prix du bitcoin qui couvre le mois</DescriptionTerm>
            <DescriptionDetails>{dollarsLisibles(resume.seuil)} $ / BTC</DescriptionDetails>
            <DescriptionTerm>{titreMois}</DescriptionTerm>
            <DescriptionDetails>{btcLisible(resume.dernierMois?.btc ?? null)}</DescriptionDetails>
            <DescriptionTerm>Facture mensuelle</DescriptionTerm>
            <DescriptionDetails>{dollarsLisibles(resume.factureMensuelle)}</DescriptionDetails>
            <DescriptionTerm>Total réglé à ce jour</DescriptionTerm>
            <DescriptionDetails>{dollarsLisibles(resume.totalRegle)}</DescriptionDetails>
          </DescriptionList>

          <AdminSectionHeading
            title="Production mensuelle"
            description="Bitcoin attesté par le contrat, mois par mois."
          />
          <Text>{phraseProductionMensuelle(production, resume.moisProduits.length)}</Text>
          {resume.moisProduits.length > 0 ? (
            <Table className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeader>Mois</TableHeader>
                  <TableHeader>BTC produit</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {resume.moisProduits.map((mois) => (
                  <TableRow key={mois.libelle}>
                    <TableCell className="font-medium">{mois.libelle}</TableCell>
                    <TableCell>{formatNumber(mois.btc, { maximumFractionDigits: 8 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : resume.dernierMois !== undefined ? (
            <DescriptionList className="mt-4">
              <DescriptionTerm>Période</DescriptionTerm>
              <DescriptionDetails>{resume.dernierMois.libelle}</DescriptionDetails>
              <DescriptionTerm>Bitcoin attesté</DescriptionTerm>
              <DescriptionDetails>
                {formatNumber(resume.dernierMois.btc, { maximumFractionDigits: 8 })} BTC
              </DescriptionDetails>
              <DescriptionTerm>Note</DescriptionTerm>
              <DescriptionDetails>
                Un seul mois de production a été rapporté — aucune tendance ne peut encore être mesurée.
              </DescriptionDetails>
            </DescriptionList>
          ) : null}

          <AdminSectionHeading
            title="La flotte"
            description="Puissance installée et régime d’exploitation déclaré par le contrat."
          />
          <DescriptionList>
            <DescriptionTerm>Puissance de calcul rapportée</DescriptionTerm>
            <DescriptionDetails>{hashrateLisible(resume.releve)} TH/s</DescriptionDetails>
            <DescriptionTerm>Bitcoin produit depuis l’origine</DescriptionTerm>
            <DescriptionDetails>{btcLisible(resume.cumulBtc)}</DescriptionDetails>
            <DescriptionTerm>Dernier relevé</DescriptionTerm>
            <DescriptionDetails>{dateLisible(resume.releve?.lastReportTime)}</DescriptionDetails>
            <DescriptionTerm>Ancienneté du relevé</DescriptionTerm>
            <DescriptionDetails>{ilYA(resume.releve?.lastReportTime)}</DescriptionDetails>
            <DescriptionTerm>Flotte</DescriptionTerm>
            <DescriptionDetails>
              {texteBooleen(resume.exploitation?.fleetActive, 'En marche', 'Arrêtée')}
            </DescriptionDetails>
            <DescriptionTerm>Délestage</DescriptionTerm>
            <DescriptionDetails>
              {texteBooleen(
                resume.exploitation?.curtailed,
                'Actif — la production est volontairement réduite',
                'Inactif',
              )}
            </DescriptionDetails>
            {resume.adresseContrat !== null ? (
              <>
                <DescriptionTerm>Contrat</DescriptionTerm>
                <DescriptionDetails className="font-mono text-sm">
                  {resume.adresseContrat}
                  {resume.chaine?.mode ? ` · mode ${resume.chaine.mode}` : ''}
                </DescriptionDetails>
              </>
            ) : null}
          </DescriptionList>

          <AdminSectionHeading
            title="Électricité"
            description="Ligne de coût du minage : ce qui est dû, ce qui a été payé, et à qui."
          />
          <DescriptionList>
            <DescriptionTerm>Facture du mois</DescriptionTerm>
            <DescriptionDetails>{dollarsLisibles(resume.factureMensuelle)}</DescriptionDetails>
            <DescriptionTerm>Total réglé</DescriptionTerm>
            <DescriptionDetails>{dollarsLisibles(resume.totalRegle)}</DescriptionDetails>
            <DescriptionTerm>Dernier paiement</DescriptionTerm>
            <DescriptionDetails>{dateLisible(resume.electricite?.lastPayment)}</DescriptionDetails>
            <DescriptionTerm>Paiement ouvert</DescriptionTerm>
            <DescriptionDetails>
              {texteBooleen(
                resume.electricite?.canPay,
                'Oui — un paiement peut être déclenché',
                'Non — aucun paiement n’est dû actuellement',
              )}
            </DescriptionDetails>
            <DescriptionTerm>Prochaine échéance</DescriptionTerm>
            <DescriptionDetails>{prochaineEcheance(resume.electricite)}</DescriptionDetails>
            <DescriptionTerm>Bénéficiaire</DescriptionTerm>
            <DescriptionDetails>
              {adresseCourte(resume.electricite?.payee) ?? 'Non communiqué'}
            </DescriptionDetails>
          </DescriptionList>

          <AdminSectionHeading
            title="Attestations de minage"
            description="Relevés de minage et mouvements d’électricité, du plus récent au plus ancien."
          />
          {resume.attestations.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Événement</TableHeader>
                  <TableHeader>Montant</TableHeader>
                  <TableHeader>Quand</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {resume.attestations.map((mouvement) => {
                  const montant = montantUsdc(mouvement.assetAmountAtomic)
                  return (
                    <TableRow
                      key={mouvement.id ?? mouvement.txHash ?? mouvement.eventName ?? 'mouvement'}
                    >
                      <TableCell className="font-medium">
                        {libelleMouvement(mouvement.eventName ?? 'Mouvement sans libellé')}
                      </TableCell>
                      <TableCell>{montant === '—' ? '—' : montant}</TableCell>
                      <TableCell title={dateLisible(mouvement.occurredAt)}>
                        {ilYA(mouvement.occurredAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <Text>Aucune attestation de minage n’a encore été enregistrée sur la chaîne.</Text>
          )}

          <AdminSectionHeading
            title="Ce à quoi le service ne publie aucune réponse"
            description="Vues construites en attente d’une lecture qui n’existe pas en HTTP aujourd’hui."
          />
          <DescriptionList>
            <DescriptionTerm>Rentabilité au prix du marché</DescriptionTerm>
            <DescriptionDetails>
              Le service ingère des relevés de marché, mais aucune route ne les publie. Sans hashprice ni
              prix du bitcoin, le seuil ci-dessus reste un seuil.
            </DescriptionDetails>
            <DescriptionTerm>Télémétrie d’exploitation</DescriptionTerm>
            <DescriptionDetails>{phraseTelemetry(minage.operationalTelemetry)}</DescriptionDetails>
          </DescriptionList>

          <AdminSectionHeading
            title="Lectures dédiées et cohérence"
            description="Deux routes HTTP distinctes de l’agrégat `mining` — chaque statut est lu tel quel, puis comparé quand les deux portent une valeur."
          />
          <DescriptionList>
            <DescriptionTerm>Hashrate on-chain</DescriptionTerm>
            <DescriptionDetails>
              <AdminReading value={editorial(etiquetteChampResolu(hashrateOnchain))} />
            </DescriptionDetails>
            <DescriptionTerm>Électricité dédiée</DescriptionTerm>
            <DescriptionDetails>
              <AdminReading value={editorial(etiquetteChampResolu(electriciteDediee))} />
            </DescriptionDetails>
            <DescriptionTerm>Cohérence hashrate</DescriptionTerm>
            <DescriptionDetails>{reconcilierHashrate(hashrateAgregat, hashrateOnchain)}</DescriptionDetails>
            <DescriptionTerm>Cohérence facture mensuelle</DescriptionTerm>
            <DescriptionDetails>
              {reconcilierFactureMensuelle(electriciteAgregat, electriciteDediee)}
            </DescriptionDetails>
          </DescriptionList>
        </>
      )}
    </div>
  )
}
