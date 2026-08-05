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
import { availabilityFromResolu, figureDepuisResolu } from '@/lib/backend/availability'
import { formatCurrency, formatDateTime, formatNumber, formatPercent } from '@/lib/format'
import { LIBELLE_MOUVEMENT, motifLisible } from '@/lib/mouvements'
import { etatSerieDe, type ChampResolu } from '@/lib/serie-etat'
import { mapAvailability, measuredCount, unavailable } from '@/lib/vaults/model'
import type { Metadata } from 'next'

const BTC_ENDPOINT = '/api/v1/btc'

export const metadata: Metadata = { title: 'Bitcoin' }
export const dynamic = 'force-dynamic'

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Evenement = {
  readonly name?: string | null
  readonly category?: string | null
  readonly severity?: string | null
  readonly timestamp?: string | null
  readonly occurredAt?: string | null
}

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
  readonly exposure?: Resolu<{
    pouch: string | null
    valueUsdc: string | null
    targetBps: number | null
    actualBps: number | null
  }>
  readonly btcProduced?: Resolu<{ totalSats: string | null; lastReportTime: string | null }>
  readonly takeProfitTiers?: Resolu<unknown>
  readonly events?: Resolu<readonly Evenement[]>
  readonly attribution?: Resolu<unknown>
  readonly production?: Resolu<Production>
  readonly custody?: Resolu<unknown>
  readonly proofs?: Resolu<readonly unknown[]>
}

type MoisProduction = {
  readonly periode: string
  readonly libelle: string
  readonly btc: number
  readonly btcExact: string
  readonly cumulExact: string | null
}

const ENTIER_DECIMAL = /^\d+$/
const PERIODE_MENSUELLE = /^(\d{4})-(\d{2})$/

const etatDe = etatSerieDe

function montantNumerique(atomique: string | null | undefined): number | null {
  if (atomique === null || atomique === undefined || atomique === '') return null
  const n = Number(atomique)
  return Number.isFinite(n) ? n / 1_000_000 : null
}

function partLisible(bps: number | null | undefined): string {
  return formatPercent(bps, { fromBps: true, maximumFractionDigits: 2 })
}

function btcExactDepuisSats(sats: string | null | undefined): string | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  const rembourre = sats.padStart(9, '0')
  const entiere = Number(rembourre.slice(0, -8))
  return `${entiere.toLocaleString('en-US')}.${rembourre.slice(-8)}`
}

function btcNombreDepuisSats(sats: string | null | undefined): number | null {
  if (typeof sats !== 'string' || !ENTIER_DECIMAL.test(sats)) return null
  return Number(sats) / 100_000_000
}

function moisLisible(periode: string): string {
  const parts = PERIODE_MENSUELLE.exec(periode)
  if (parts === null) return periode
  const date = new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, 1))
  if (Number.isNaN(date.getTime())) return periode
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
}

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
  return retenus.sort((a, b) => a.periode.localeCompare(b.periode))
}

function etatProductionDe(bloc: ChampResolu | undefined, moisRetenus: number): string {
  if (moisRetenus > 0) return 'Historique de production mensuelle.'
  if (bloc?.status === 'LIVE') {
    return 'Les rapports de production ont bien été interrogés : aucun mois exploitable n’apparaît encore.'
  }
  const etat = etatDe(bloc, 'Les rapports de production mensuels ne sont pas encore transmis par le service.')
  if (etat.type === 'attendue' || etat.type === 'indisponible' || etat.type === 'vide') return etat.explication
  return 'Les rapports de production mensuels ne sont pas encore transmis par le service.'
}

function contexteObservationDe(cumulProduction: string | null): string {
  if (cumulProduction === null) {
    return 'Bitcoin attesté par le service pour ce mois, au satoshi près.'
  }
  return `Bitcoin attesté par le service pour ce mois, au satoshi près. Cumul depuis l’origine : ${cumulProduction} BTC.`
}

const GRAVITE: Record<string, string> = {
  critical: 'Critique',
  error: 'Anomalie',
  warning: 'À surveiller',
  warn: 'À surveiller',
  info: 'Pour information',
  notice: 'Pour information',
}

function graviteLisible(brut: string | null | undefined): string {
  if (typeof brut !== 'string') return 'Non classé'
  return GRAVITE[brut.toLowerCase()] ?? 'Non classé'
}

function nomLisible(brut: string | null | undefined): string {
  if (typeof brut !== 'string' || brut === '') return 'Événement sans titre'
  const traduit = LIBELLE_MOUVEMENT[brut]
  if (traduit !== undefined) return traduit
  const decoupe = brut
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  return decoupe === '' ? 'Événement sans titre' : decoupe
}

function phrasePreuves(bloc: Resolu<readonly unknown[]>): string {
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    const motif = motifLisible(bloc.reason)
    if (motif === undefined) return 'Le registre des preuves n’a pas pu être interrogé.'
    return `Le registre des preuves n’a pas pu être interrogé : ${motif}.`
  }
  if (bloc.value.length === 0) {
    return 'Le registre a été interrogé et il est vide : aucune preuve n’a encore été publiée. Ce n’est pas une source manquante.'
  }
  const nombre = bloc.value.length
  const accord = nombre > 1 ? 'preuves enregistrées' : 'preuve enregistrée'
  return `${nombre} ${accord} dans le registre.`
}

function phraseSourceNonExposee(bloc: ChampResolu | undefined, defaut: string): string {
  const etat = etatDe(bloc, defaut)
  if (etat.type === 'attendue' || etat.type === 'indisponible') return etat.explication
  return defaut
}

type VueBitcoin = Readonly<{
  reponse: Btc | null
  bitcoinProduit: string
  reserve: { balanceUsdc: string | null; balanceBtc: string | null } | null | undefined
  exposition: {
    pouch: string | null
    valueUsdc: string | null
    targetBps: number | null
    actualBps: number | null
  } | null | undefined
  produit: { totalSats: string | null; lastReportTime: string | null } | null | undefined
  montantReserve: number | null
  montantExposition: number | null
  evenements: readonly Evenement[]
  fluxLisible: boolean
  moisProduction: readonly MoisProduction[]
  cumulProduction: string | null
  dernierMois: MoisProduction | undefined
  contexteObservation: string
}>

function buildBitcoinViewModel(reponse: Btc | null): VueBitcoin {
  const b = reponse
  const reserve = b?.reserve?.value
  const exposition = b?.exposure?.value
  const produit = b?.btcProduced?.value

  const satsNombre = btcNombreDepuisSats(produit?.totalSats)
  const bitcoinProduit = formatNumber(satsNombre, { maximumFractionDigits: 8 })

  const montantReserve = montantNumerique(reserve?.balanceUsdc)
  const montantExposition = montantNumerique(exposition?.valueUsdc)

  const evenements = b?.events?.value
  const listeEvenements = evenements ?? []
  const fluxLisible = listeEvenements.length > 0 || b?.events?.status === 'LIVE'

  const production = b?.production?.value
  const moisProduction = moisExploitables(production)
  const cumulProduction = btcExactDepuisSats(production?.cumulativeSatsEarned)
  const dernierMois = moisProduction.at(-1)
  const contexteObservation = contexteObservationDe(cumulProduction)

  return {
    reponse: b,
    bitcoinProduit,
    reserve,
    exposition,
    produit,
    montantReserve,
    montantExposition,
    evenements: listeEvenements,
    fluxLisible,
    moisProduction,
    cumulProduction,
    dernierMois,
    contexteObservation,
  }
}

/**
 * Bitcoin — Catalyst pur.
 * Source : btc.
 */
export default async function Page() {
  await requireSession()
  const reponse = await callBackend<Btc>('btc')
  const vue = buildBitcoinViewModel(reponse.ok ? reponse.data : null)
  const b = vue.reponse

  const btcProduitCell = figureDepuisResolu(
    reponse.ok ? b?.btcProduced : undefined,
    BTC_ENDPOINT,
    () => vue.bitcoinProduit,
  )
  const reserveCell = figureDepuisResolu(
    reponse.ok ? b?.reserve : undefined,
    BTC_ENDPOINT,
    (r) => formatCurrency(r.balanceUsdc, { decimals: 0 }),
  )
  const expositionCell = figureDepuisResolu(
    reponse.ok ? b?.exposure : undefined,
    BTC_ENDPOINT,
    (e) => formatCurrency(e.valueUsdc, { decimals: 0 }),
  )
  const productionAvail = availabilityFromResolu<Production>(
    reponse.ok ? b?.production : undefined,
    BTC_ENDPOINT,
  )
  const monthlyReportsCell = mapAvailability(productionAvail, (production) =>
    String(moisExploitables(production).length),
  )
  const eventsAvail = availabilityFromResolu<readonly Evenement[]>(
    reponse.ok ? b?.events : undefined,
    BTC_ENDPOINT,
  )
  const eventRowsCell = mapAvailability(eventsAvail, () => String(vue.evenements.length))

  const hasExposition = vue.exposition !== null && vue.exposition !== undefined
  const pouchLabel =
    vue.exposition?.pouch === null || vue.exposition?.pouch === undefined || vue.exposition.pouch === ''
      ? 'Non renseigné'
      : vue.exposition.pouch

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Bitcoin"
        description="Ce que le fonds a produit, où se trouve l’argent, et ce qui s’est passé récemment. Aucun rendement projeté."
      />

      <DescriptionList>
        <DescriptionTerm>BTC produit</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={btcProduitCell} />
        </DescriptionDetails>
        <DescriptionTerm>Réserve</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={reserveCell} />
        </DescriptionDetails>
        <DescriptionTerm>Exposition</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={expositionCell} />
        </DescriptionDetails>
        <DescriptionTerm>Rapports mensuels</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={monthlyReportsCell} />
        </DescriptionDetails>
        <DescriptionTerm>Lignes d’événement</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={eventRowsCell} />
        </DescriptionDetails>
        <DescriptionTerm>Source bitcoin</DescriptionTerm>
        <DescriptionDetails>{b === null ? 'Indisponible' : 'Disponible'}</DescriptionDetails>
      </DescriptionList>

      {b === null ? (
        <Text>
          L’état bitcoin n’a pas pu être lu. Le service n’a pas répondu — aucune valeur n’est affichée plutôt
          qu’une valeur obsolète.
        </Text>
      ) : (
        <>
          <AdminSectionHeading
            title="Ce que le fonds a produit"
            description="Bitcoin attesté par le contrat depuis l’origine, et le rythme auquel il s’accumule."
          />
          <DescriptionList>
            <DescriptionTerm>Bitcoin produit à ce jour</DescriptionTerm>
            <DescriptionDetails>{vue.bitcoinProduit} BTC</DescriptionDetails>
            <DescriptionTerm>Réserve dormante</DescriptionTerm>
            <DescriptionDetails>{formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 })}</DescriptionDetails>
            <DescriptionTerm>Valeur exposée au marché</DescriptionTerm>
            <DescriptionDetails>{formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 })}</DescriptionDetails>
            <DescriptionTerm>Dernier rapport de production</DescriptionTerm>
            <DescriptionDetails>{formatDateTime(vue.produit?.lastReportTime)}</DescriptionDetails>
            {b.proofs !== undefined ? (
              <>
                <DescriptionTerm>Registre des preuves</DescriptionTerm>
                <DescriptionDetails>{phrasePreuves(b.proofs)}</DescriptionDetails>
              </>
            ) : null}
          </DescriptionList>

          <AdminSectionHeading
            title="Rythme de production"
            description="Un mois est une observation, pas un rythme — le tableau apparaît au premier rapport exploitable."
          />
          <Text>{etatProductionDe(b.production, vue.moisProduction.length)}</Text>
          {vue.moisProduction.length > 0 ? (
            <Table className="mt-4">
              <TableHead>
                <TableRow>
                  <TableHeader>Mois</TableHeader>
                  <TableHeader>BTC (exact)</TableHeader>
                  <TableHeader>Cumul BTC</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {vue.moisProduction.map((mois) => (
                  <TableRow key={mois.periode}>
                    <TableCell className="font-medium">{mois.libelle}</TableCell>
                    <TableCell>{mois.btcExact}</TableCell>
                    <TableCell>{mois.cumulExact ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : vue.dernierMois !== undefined ? (
            <DescriptionList className="mt-4">
              <DescriptionTerm>Période</DescriptionTerm>
              <DescriptionDetails>{vue.dernierMois.libelle}</DescriptionDetails>
              <DescriptionTerm>Bitcoin attesté</DescriptionTerm>
              <DescriptionDetails>{vue.dernierMois.btcExact} BTC</DescriptionDetails>
              <DescriptionTerm>Contexte</DescriptionTerm>
              <DescriptionDetails>{vue.contexteObservation}</DescriptionDetails>
              <DescriptionTerm>Note</DescriptionTerm>
              <DescriptionDetails>
                Un seul mois a été rapporté — un rythme est l’écart entre deux mois, et il n’y a pas encore de
                deuxième mois.
              </DescriptionDetails>
            </DescriptionList>
          ) : null}

          <AdminSectionHeading
            title="Où se trouve l’argent"
            description="Réserve dormante et valeur exposée au marché, lues on-chain."
          />
          {vue.montantReserve !== null || vue.montantExposition !== null ? (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Poste</TableHeader>
                  <TableHeader>Montant USD</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {vue.montantReserve !== null ? (
                  <TableRow>
                    <TableCell className="font-medium">Réserve</TableCell>
                    <TableCell>{formatCurrency(vue.reserve?.balanceUsdc, { decimals: 0 })}</TableCell>
                  </TableRow>
                ) : null}
                {vue.montantExposition !== null ? (
                  <TableRow>
                    <TableCell className="font-medium">Exposition</TableCell>
                    <TableCell>{formatCurrency(vue.exposition?.valueUsdc, { decimals: 0 })}</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          ) : (
            <Text>
              Ni la réserve ni la valeur exposée n’ont pu être lues on-chain. Rien n’est tracé plutôt qu’une
              répartition à zéro.
            </Text>
          )}

          {hasExposition ? (
            <DescriptionList className="mt-4">
              <DescriptionTerm>Poche exposée</DescriptionTerm>
              <DescriptionDetails>{pouchLabel}</DescriptionDetails>
              <DescriptionTerm>Part cible</DescriptionTerm>
              <DescriptionDetails>{partLisible(vue.exposition?.targetBps)}</DescriptionDetails>
              <DescriptionTerm>Part observée</DescriptionTerm>
              <DescriptionDetails>{partLisible(vue.exposition?.actualBps)}</DescriptionDetails>
            </DescriptionList>
          ) : null}

          {vue.fluxLisible ? (
            <>
              <AdminSectionHeading
                title="Ce qui s’est passé récemment"
                description="Mouvements et alertes rapportés par le service, du plus récent au plus ancien."
              />
              {vue.evenements.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeader>Événement</TableHeader>
                      <TableHeader>Catégorie</TableHeader>
                      <TableHeader>Gravité</TableHeader>
                      <TableHeader>Horodatage</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vue.evenements.map((evenement, index) => (
                      <TableRow
                        key={`${evenement.name ?? 'evenement'}-${evenement.timestamp ?? evenement.occurredAt ?? String(index)}`}
                      >
                        <TableCell className="font-medium">{nomLisible(evenement.name)}</TableCell>
                        <TableCell>
                          {evenement.category === null ||
                          evenement.category === undefined ||
                          evenement.category === ''
                            ? '—'
                            : nomLisible(evenement.category)}
                        </TableCell>
                        <TableCell>{graviteLisible(evenement.severity)}</TableCell>
                        <TableCell>
                          {formatDateTime(evenement.timestamp ?? evenement.occurredAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Text>Aucun mouvement bitcoin n’a été enregistré. Rien ne requiert d’attention.</Text>
              )}
            </>
          ) : null}

          <AdminSectionHeading
            title="Ce que la source n’expose pas"
            description="Ces lectures n’existent pas dans le contrat déployé — la raison exacte est nommée sous chacune."
          />
          <DescriptionList>
            <DescriptionTerm>Ventilation du rendement</DescriptionTerm>
            <DescriptionDetails>
              {phraseSourceNonExposee(
                b.attribution,
                'Le contrat n’expose aucune ventilation du rendement bitcoin.',
              )}
            </DescriptionDetails>
            <DescriptionTerm>Conservation</DescriptionTerm>
            <DescriptionDetails>
              {phraseSourceNonExposee(
                b.custody,
                'Aucun conservateur n’est intégré : aucun lieu de conservation n’a été déclaré à ce jour.',
              )}
            </DescriptionDetails>
            <DescriptionTerm>Paliers de prise de profit</DescriptionTerm>
            <DescriptionDetails>
              {phraseSourceNonExposee(
                b.takeProfitTiers,
                'Le contrat n’expose aucun palier de prise de profit.',
              )}
            </DescriptionDetails>
          </DescriptionList>
        </>
      )}
    </div>
  )
}
