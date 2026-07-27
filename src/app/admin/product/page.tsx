import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { VendingCurveChart, type PointCourbe } from '@/components/admin/product-charts'
import { callBackend } from '@/lib/backend/client'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Fiche produit' }
export const dynamic = 'force-dynamic'

/**
 * Fiche produit — ce à quoi un souscripteur s'engage.
 *
 * L'ancienne page déversait la réponse d'une route. Une fiche produit n'est
 * pourtant pas un objet technique : c'est un contrat. Trois questions la
 * résument — combien faut-il déposer et pour combien de temps, comment la
 * rémunération évolue au fil des mois, et où l'argent est censé être placé.
 *
 * ── Le piège de la courbe plate ────────────────────────────────────────────
 * Le service renvoie bien cinq échéances réelles, mais tous les taux y valent
 * zéro sur ce déploiement. Tracer cette ligne serait un mensonge de lecture :
 * elle se lirait « rémunération nulle mesurée » alors que la vérité est
 * « paramétrage absent ». La constante `courbeParametree` fait la différence,
 * et le cadre affiche alors ce qu'on attend plutôt qu'une courbe à plat.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Poche = {
  readonly pocket?: string | null
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
}

type Termes = {
  readonly productDurationMonths?: number | null
  readonly minimumDepositUsdc?: string | null
  readonly allocation?: { readonly pockets?: readonly Poche[] | null } | null
}

type Factsheet = {
  readonly terms?: Resolu<Termes>
  readonly tvlCap?: Resolu<string | number>
  readonly vendingCurve?: Resolu<readonly { month: number; bps: number }[]>
}

const MOTIF: Record<string, string> = {
  dynavault_not_deployed: 'ces termes ne sont pas encore ouverts sur le contrat déployé',
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

function usdc(atomique: string | number | null | undefined, decimales = 0): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const n = Number(atomique)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

/**
 * Une durée de zéro mois n'est pas une durée : c'est un terme non fixé. Le
 * produit ne se referme alors sur aucune échéance — il faut le dire, pas
 * afficher « 0 mois ».
 */
function dureeLisible(mois: number | null | undefined): string {
  if (mois === null || mois === undefined || !Number.isFinite(mois)) return '—'
  if (mois <= 0) return 'Sans échéance fixée'
  return `${mois.toLocaleString('fr-FR')} mois`
}

/** Un écart se lit signé, et son ampleur décide de sa couleur. */
function ecartLisible(cible: number | null, reel: number | null): { texte: string; ton: string } {
  if (cible === null || reel === null) return { texte: '—', ton: 'text-zinc-500' }
  const pts = (reel - cible) / 100
  const ampleur = Math.abs(pts)
  let ton = 'text-success-400'
  if (ampleur >= 5) ton = 'text-warning-400'
  else if (ampleur >= 1) ton = 'text-zinc-300'
  const signe = pts > 0 ? '+' : ''
  return { texte: `${signe}${pts.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`, ton }
}

function partLisible(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

function etatCourbe(points: readonly PointCourbe[], courbeParametree: boolean, vendingCurve: Resolu<unknown> | undefined): EtatSerie {
  if (points.length === 0) {
    return etatDe(vendingCurve, 'Les termes de rémunération ne sont pas encore transmis.')
  }
  if (courbeParametree) return { type: 'tracee' }
  return {
    type: 'attendue',
    explication:
      'Les cinq échéances du produit sont bien définies, mais aucun taux n’y est encore inscrit. La courbe s’affichera dès qu’ils le seront.',
  }
}

export default async function Page() {
  const reponse = await callBackend<Factsheet>('product-factsheet')
  const f = reponse.ok ? reponse.data : null

  const termes = f?.terms?.value
  const plafond = f?.tvlCap?.value

  // Répartition cible par poche. Une poche sans cible lisible est écartée
  // plutôt que ramenée à zéro.
  const pochesBrutes = termes?.allocation?.pockets
  const poches = pochesBrutes ?? []
  const lisibles = poches.filter((p) => p.targetBps !== null && p.targetBps !== undefined && Number.isFinite(p.targetBps))

  const repartition: PocheAllocation[] = lisibles.map((p) => ({
    poche:
      p.label === null || p.label === undefined || p.label === ''
        ? (p.pocket ?? 'Poche sans nom')
        : p.label,
    cible: Number(p.targetBps) / 100,
    reel:
      p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
        ? null
        : p.actualBps / 100,
  }))

  // Courbe de rémunération. Cinq échéances réelles, tous les taux à zéro :
  // la courbe n'est pas paramétrée. Tracer une ligne plate se lirait comme
  // « rémunération nulle mesurée », ce qui est faux.
  const courbeBrute = f?.vendingCurve?.value
  const points: PointCourbe[] =
    courbeBrute === null || courbeBrute === undefined
      ? []
      : courbeBrute.map((p) => ({ mois: p.month, taux: p.bps / 100 }))
  const courbeParametree = points.some((p) => p.taux !== 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiche produit"
        description="Les conditions auxquelles on souscrit : dépôt minimum, durée, plafond du fonds, rémunération attendue et répartition visée de l’argent."
        endpointIds={['product-factsheet']}
      />

      {f === null ? (
        <SourceAttendue
          quoi="La fiche produit n’a pas pu être lue"
          detail="Le service n’a pas répondu. Aucune condition n’est affichée plutôt qu’une condition périmée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          {/* ── Les termes du produit ─────────────────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure
                valeur={usdc(termes?.minimumDepositUsdc)}
                libelle="Dépôt minimum pour souscrire"
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                <SideFact libelle="Durée du produit" valeur={dureeLisible(termes?.productDurationMonths)} />
                <SideFact libelle="Plafond du fonds" valeur={usdc(plafond)} />
              </dl>
            </div>
          </Card>

          {/* ── La rémunération ───────────────────────────────────────────── */}
          <ChartFrame
            question="Comment la rémunération évolue-t-elle sur la durée ?"
            unite="en pourcentage, par mois"
            provenance="termes du produit"
            etat={etatCourbe(points, courbeParametree, f.vendingCurve)}
          >
            <VendingCurveChart points={points} />
          </ChartFrame>

          {/* ── La répartition visée ──────────────────────────────────────── */}
          <ChartFrame
            question="Où l’argent est-il censé être placé ?"
            unite="en pourcentage du portefeuille"
            provenance="termes du produit"
            etat={
              repartition.length > 0
                ? { type: 'tracee' }
                : etatDe(f.terms, 'Aucune répartition cible n’est encore inscrite dans les termes du produit.')
            }
          >
            <AllocationChart poches={repartition} />
          </ChartFrame>

          {lisibles.length > 0 ? (
            <Card>
              <CardHeader
                title="Quelle part revient à chaque poche ?"
                hint="La part visée par le contrat, celle constatée sur la chaîne, et l’écart entre les deux"
              />
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07] text-left text-xs text-zinc-500">
                      <th scope="col" className="px-5 py-2.5 font-medium">
                        Poche
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Visée
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Constatée
                      </th>
                      <th scope="col" className="px-5 py-2.5 text-right font-medium">
                        Écart
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {lisibles.map((p, index) => {
                      const cible = Number(p.targetBps)
                      const reel =
                        p.actualBps === null || p.actualBps === undefined || !Number.isFinite(p.actualBps)
                          ? null
                          : p.actualBps
                      const ecart = ecartLisible(cible, reel)
                      return (
                        <tr key={p.pocket ?? p.label ?? String(index)}>
                          <th scope="row" className="px-5 py-3 text-left font-normal text-zinc-200">
                            {p.label === null || p.label === undefined || p.label === ''
                              ? (p.pocket ?? 'Poche sans nom')
                              : p.label}
                          </th>
                          <td className="px-5 py-3 text-right text-zinc-400 tabular-nums">{partLisible(cible)}</td>
                          <td className="px-5 py-3 text-right text-zinc-200 tabular-nums">{partLisible(reel)}</td>
                          <td className={clsx('px-5 py-3 text-right tabular-nums', ecart.ton)}>{ecart.texte}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </>
      )}

      {/* La réponse brute reste consultable en bas de page, pour qui veut
          vérifier un champ que la lecture métier n'expose pas. */}
      <EndpointSection endpointId="product-factsheet" title="La réponse complète du service" />
    </div>
  )
}
