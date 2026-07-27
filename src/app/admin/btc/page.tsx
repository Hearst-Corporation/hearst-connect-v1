import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { CalmState, Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { ReserveExpositionChart, type PosteBitcoin } from '@/components/admin/product-charts'
import { callBackend } from '@/lib/backend/client'
import { LIBELLE_MOUVEMENT } from '@/lib/mouvements'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bitcoin' }
export const dynamic = 'force-dynamic'

/**
 * Bitcoin — ce qui a été produit, où l'argent dort, ce qui s'est passé.
 *
 * L'ancienne page déversait la réponse d'une route. Elle répondait donc à la
 * question « que renvoie le service ? », que personne ne se pose. Celle-ci en
 * pose trois : combien de bitcoin le fonds a produit, comment son argent se
 * partage entre réserve dormante et exposition au marché, et ce qui mérite
 * d'être su parmi les derniers événements.
 *
 * Quatre mesures ne sont pas encore ouvertes sur le contrat déployé —
 * attribution du rendement, cadence de production, garde des avoirs, paliers
 * de prise de bénéfice. Leurs cadres restent posés, avec la phrase qui dit ce
 * qu'on attend : le jour où la source répond, la série remplace la phrase et
 * la mise en page ne bouge pas.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Evenement = {
  readonly name?: string | null
  readonly category?: string | null
  readonly severity?: string | null
  readonly occurredAt?: string | null
  readonly detail?: string | null
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
  readonly production?: Resolu<unknown>
  readonly custody?: Resolu<unknown>
}

/** Traduit un motif machine en phrase, ou reste muet plutôt que de le laisser fuir. */
const MOTIF: Record<string, string> = {
  dynavault_not_deployed: 'cette mesure n’est pas encore ouverte sur le contrat déployé',
  not_available: 'la source n’est pas encore branchée',
  not_configured: 'la source n’est pas encore paramétrée',
  db_error: 'la base de données n’a pas répondu',
  rpc_error: 'la chaîne n’a pas répondu',
}

function explication(bloc: Resolu<unknown> | undefined, defaut: string): string {
  const brut = bloc?.reason
  if (typeof brut !== 'string' || brut === '') return defaut
  return MOTIF[brut] ?? defaut
}

/** Décide l'état d'un cadre à partir du statut réel renvoyé par le service. */
function etatDe(bloc: Resolu<unknown> | undefined, defaut: string): EtatSerie {
  if (bloc === undefined) return { type: 'attendue', explication: defaut }
  if (bloc.status === 'UNAVAILABLE' || bloc.status === 'ERROR') {
    return { type: 'indisponible', explication: explication(bloc, defaut) }
  }
  if (bloc.status !== 'LIVE' || bloc.value === null) {
    return { type: 'attendue', explication: explication(bloc, defaut) }
  }
  return { type: 'tracee' }
}

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

/** La gravité décide de la couleur ET du mot : un daltonien lit le même état. */
const GRAVITE: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  critical: { mot: 'Critique', point: 'bg-zinc-950', texte: 'text-zinc-950' },
  error: { mot: 'Anomalie', point: 'bg-zinc-950', texte: 'text-zinc-950' },
  warning: { mot: 'À surveiller', point: 'bg-zinc-600', texte: 'text-zinc-700' },
  warn: { mot: 'À surveiller', point: 'bg-zinc-600', texte: 'text-zinc-700' },
  info: { mot: 'Pour information', point: 'bg-zinc-300', texte: 'text-zinc-600' },
  notice: { mot: 'Pour information', point: 'bg-zinc-300', texte: 'text-zinc-600' },
}

function graviteLisible(brut: string | null | undefined) {
  if (typeof brut !== 'string') return { mot: 'Non qualifié', point: 'bg-zinc-300', texte: 'text-zinc-500' }
  return GRAVITE[brut.toLowerCase()] ?? { mot: 'Non qualifié', point: 'bg-zinc-300', texte: 'text-zinc-500' }
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

function CeQuiSestPasse({
  evenements,
  statutLive,
}: Readonly<{ evenements: readonly Evenement[]; statutLive: boolean }>) {
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
      <ul className="divide-hairline divide-y">
        {evenements.map((e, index) => {
          const gravite = graviteLisible(e.severity)
          return (
            <li
              key={`${e.name ?? 'evenement'}-${e.occurredAt ?? String(index)}`}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 text-sm"
            >
              <span aria-hidden="true" className={clsx('h-px w-4 shrink-0', gravite.point)} />
              <span className="min-w-0 flex-1 text-zinc-950">{nomLisible(e.name)}</span>
              {e.category === null || e.category === undefined || e.category === '' ? null : (
                <span className="text-xs text-zinc-500">{nomLisible(e.category)}</span>
              )}
              <span className={clsx('text-xs font-medium', gravite.texte)}>{gravite.mot}</span>
              <span className="text-xs text-zinc-500 tabular-nums">{dateLisible(e.occurredAt)}</span>
            </li>
          )
        })}
      </ul>
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

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        title="Bitcoin"
        description="Ce que le fonds a produit en bitcoin, comment son argent se partage entre réserve et exposition, et ce qui s’est passé récemment."
        endpointIds={['btc']}
      />

      {b === null ? (
        <SourceAttendue
          quoi="L’état bitcoin n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur périmée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          {/* ── Ce que le fonds a produit ─────────────────────────────────── */}
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure valeur={bitcoinProduit} libelle="Bitcoin produit à ce jour" unite="BTC" />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <SideFact libelle="Réserve dormante" valeur={usdc(reserve?.balanceUsdc)} />
                <SideFact libelle="Valeur exposée au marché" valeur={usdc(exposition?.valueUsdc)} />
                <SideFact libelle="Dernier relevé de production" valeur={dateLisible(produit?.lastReportTime)} />
              </dl>
            </div>
          </Card>

          {/* ── Où l'argent se trouve ─────────────────────────────────────── */}
          <ChartFrame
            question="Où l’argent se trouve-t-il ?"
            unite="en dollars"
            provenance="lu sur la chaîne"
            etat={
              postes.length > 0
                ? { type: 'tracee' }
                : {
                    type: 'attendue',
                    explication:
                      'Ni la réserve ni la valeur exposée n’ont pu être lues sur la chaîne. Rien n’est tracé plutôt qu’une répartition à zéro.',
                  }
            }
            hauteur="h-56"
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
              <ul className="divide-hairline divide-y">
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-600">Poche exposée</span>
                  <span className="text-zinc-950">
                    {exposition.pouch === null || exposition.pouch === undefined || exposition.pouch === ''
                      ? 'Non communiquée'
                      : exposition.pouch}
                  </span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-600">Part visée</span>
                  <span className="text-zinc-950 tabular-nums">{partLisible(exposition.targetBps)}</span>
                </li>
                <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                  <span className="w-40 shrink-0 text-zinc-600">Part constatée</span>
                  <span className="text-zinc-950 tabular-nums">{partLisible(exposition.actualBps)}</span>
                </li>
              </ul>
            </Card>
          )}

          {/* ── Ce qui s'est passé ────────────────────────────────────────── */}
          <CeQuiSestPasse evenements={listeEvenements} statutLive={b.events?.status === 'LIVE'} />

          {/* ── Cadres en attente de leur source ──────────────────────────── */}
          <div className="grid gap-8 lg:grid-cols-2">
            <ChartFrame
              question="D’où vient le rendement du bitcoin ?"
              unite="en pourcentage du total"
              provenance="décomposition du rendement"
              etat={etatDe(
                b.attribution,
                'La décomposition du rendement n’est pas encore calculée sur ce déploiement.',
              )}
              hauteur="h-52"
            />
            <ChartFrame
              question="À quelle cadence le bitcoin est-il produit ?"
              unite="en bitcoin, par période"
              provenance="relevés de production"
              etat={etatDe(
                b.production,
                'Le service ne transmet qu’un cumul, sans historique. Une courbe exigerait une série conservée dans le temps.',
              )}
              hauteur="h-52"
            />
            <ChartFrame
              question="Où les bitcoins sont-ils conservés ?"
              unite="en bitcoin, par lieu de conservation"
              provenance="registre de conservation"
              etat={etatDe(b.custody, 'La répartition des avoirs par lieu de conservation n’est pas encore transmise.')}
              hauteur="h-52"
            />
            <ChartFrame
              question="À quels prix les bénéfices sont-ils pris ?"
              unite="en dollars, par palier"
              provenance="termes du produit"
              etat={etatDe(
                b.takeProfitTiers,
                'Les paliers de prise de bénéfice ne sont pas encore ouverts sur le contrat déployé.',
              )}
              hauteur="h-52"
            />
          </div>
        </>
      )}

      {/* La réponse brute reste consultable en bas de page, pour qui veut
          vérifier un champ que la lecture métier n'expose pas. */}
      <EndpointSection endpointId="btc" title="La réponse complète du service" />
    </div>
  )
}
