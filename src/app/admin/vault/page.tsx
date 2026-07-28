import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { UtilizationChart } from '@/components/admin/utilization-chart'
import { VaultEcartChart, type EcartPoche, type NiveauEcart } from '@/components/admin/vault-ecart-chart'
import { callBackend } from '@/lib/backend/client'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Portefeuille' }
export const dynamic = 'force-dynamic'

/**
 * Portefeuille — combien, jusqu'où, et réparti comment.
 *
 * L'ancienne page alignait trois réponses brutes de routes. Celle-ci pose
 * trois questions : quel encours, quelle marge avant le plafond, et l'argent
 * est-il placé conformément aux cibles du contrat.
 *
 * L'écart entre cible et réel est la seule colonne qui déclenche une action.
 * Elle est donc traitée comme telle : signée, colorée par ampleur, et nommée
 * en points d'écart plutôt qu'en points de base — personne ne lit « 315 »
 * comme « trois points d'écart ». Elle a désormais DEUX lectures qui ne se
 * doublonnent pas : le graphique donne le sens et l'ampleur relative sur un
 * axe centré sur zéro, le tableau donne les chiffres exacts.
 *
 * ── Ce que cette page refuse de tracer ─────────────────────────────────────
 * 1. Aucun encours par poche EN DOLLARS. La route `rwa-vault` expose bien un
 *    `pocketAssets`, mais il contredit l'`actualBps` de `vault/strategies` sur
 *    deux poches sur trois (S1 : 460 $ lus contre ~332 000 $ impliqués par
 *    2820 bps). Tant que les deux lectures on-chain divergent, convertir des
 *    points de base en dollars reviendrait à choisir un chiffre — et à lui
 *    donner une précision qu'il n'a pas. La répartition reste donc en
 *    pourcentage, unité dans laquelle le backend est cohérent avec lui-même.
 * 2. Aucune courbe de valeur de part. `navPerShare` est un point, pas une
 *    série : le backend n'expose aucun historique de valeur liquidative. Une
 *    ligne tracée entre un seul point et l'origine se lirait comme une
 *    performance mesurée.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Vault = {
  readonly snapshot?: Resolu<{ asset: string; totalAssets: string; totalShares: string; navPerShare: string }>
  readonly capacity?: Resolu<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
}

type Strategie = {
  readonly pocket: string
  readonly label: string
  readonly targetBps: number
  readonly actualBps: number | null
  readonly driftBps: number | null
  readonly isIdle: boolean
}

type Strategies = { readonly strategies?: Resolu<readonly Strategie[]> }

/** Montant atomique USDC (6 décimales, en chaîne) rendu en dollars. */
function usdc(atomique: string | null | undefined, decimales = 0): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const n = Number(atomique)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

/** Un nombre déjà exprimé en dollars, rendu avec son unité. */
function dollars(montant: number, decimales = 0): string {
  return `${montant.toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

function nombreOuNull(brut: string | null | undefined): number | null {
  if (brut === null || brut === undefined || brut === '') return null
  const n = Number(brut)
  return Number.isFinite(n) ? n : null
}

function pourcentBps(bps: number, decimales = 2): string {
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} %`
}

/* ── Lecture de l'écart ──────────────────────────────────────────────────── */

/**
 * Seuils historiques de cette page, désormais nommés une seule fois : sous un
 * point d'écart la poche est dans la tolérance, au-delà de cinq points elle
 * demande une correction. Le graphique et le tableau lisent la même règle.
 */
function niveauEcart(points: number): NiveauEcart {
  const ampleur = Math.abs(points)
  if (ampleur >= 5) return 'a-corriger'
  if (ampleur >= 1) return 'modere'
  return 'conforme'
}

/** La couleur ne dit jamais l'état toute seule : le mot l'accompagne partout. */
const NIVEAU_MOT: Record<NiveauEcart, string> = {
  conforme: 'dans la tolérance',
  modere: 'écart modéré',
  'a-corriger': 'à corriger',
}

const NIVEAU_TON: Record<NiveauEcart, string> = {
  conforme: 'text-success-400',
  modere: 'text-zinc-300',
  'a-corriger': 'text-warning-400',
}

/** Un écart se lit signé, et son ampleur décide de sa couleur. */
function ecartLisible(driftBps: number | null): { texte: string; ton: string; mot: string } {
  if (driftBps === null || !Number.isFinite(driftBps)) {
    return { texte: '—', ton: 'text-zinc-400', mot: 'non lisible' }
  }
  const pts = driftBps / 100
  const niveau = niveauEcart(pts)
  const signe = pts > 0 ? '+' : ''
  return {
    texte: `${signe}${pts.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`,
    ton: NIVEAU_TON[niveau],
    mot: NIVEAU_MOT[niveau],
  }
}

/* ── Tableau des écarts ──────────────────────────────────────────────────── */

function EcartsTable({ actives }: Readonly<{ actives: readonly Strategie[] }>) {
  return (
    <Card>
      <CardHeader
        title="Quelles poches s’écartent de leur cible ?"
        hint="Un écart positif signale une poche en avance sur sa cible"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-white/[0.07] text-left text-xs text-zinc-400">
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
              <th scope="col" className="px-5 py-2.5 text-right font-medium">
                État
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-950/5 dark:divide-white/5">
            {actives.map((s) => {
              const ecart = ecartLisible(s.driftBps)
              return (
                <tr key={s.pocket}>
                  <th scope="row" className="px-5 py-3 text-left font-normal text-zinc-200">
                    {s.label}
                  </th>
                  <td className="px-5 py-3 text-right text-zinc-400 tabular-nums">{pourcentBps(s.targetBps)}</td>
                  <td className="px-5 py-3 text-right text-zinc-200 tabular-nums">
                    {s.actualBps === null ? '—' : pourcentBps(s.actualBps)}
                  </td>
                  <td className={clsx('px-5 py-3 text-right tabular-nums', ecart.ton)}>{ecart.texte}</td>
                  {/* L'état est écrit, pas seulement teinté : un lecteur qui ne
                      distingue pas les nuances lit la même information. */}
                  <td className={clsx('px-5 py-3 text-right text-xs', ecart.ton)}>{ecart.mot}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ── Contrôle de cohérence parts × valeur de part ────────────────────────── */

/**
 * Le premier contrôle qu'un gérant fait sur un fonds : le nombre de parts
 * multiplié par la valeur de la part doit redonner l'encours. Les trois termes
 * sont servis LIVE par `vault` — il n'y a donc rien à inventer, seulement à
 * vérifier, et à dire de combien ça tombe à côté.
 *
 * La tolérance n'est pas choisie au doigt mouillé : la valeur de part est
 * publiée à six décimales, chaque part porte donc jusqu'à 0,5 × 10⁻⁶ $
 * d'arrondi. Au-delà de cette borne, l'écart n'est plus un arrondi.
 */
function ControleCoherence({
  parts,
  valeurPart,
  encours,
}: Readonly<{ parts: number; valeurPart: number; encours: number }>) {
  const reconstitue = parts * valeurPart
  const ecart = Math.abs(encours - reconstitue)
  const tolerance = parts * 0.5e-6
  const coherent = ecart <= tolerance

  return (
    <p className="mt-6 border-t border-zinc-950/5 pt-4 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">Contrôle de cohérence · </span>
      {parts.toLocaleString('fr-FR')} parts × {valeurPart.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${' '}
      = {dollars(reconstitue)}, soit {dollars(ecart, 2)} d’écart avec l’encours lu.{' '}
      <span className={coherent ? 'text-success-400' : 'text-warning-400'}>
        {coherent
          ? `Cohérent : l’arrondi de la valeur de part explique jusqu’à ${dollars(tolerance, 2)}.`
          : `À vérifier : l’écart dépasse les ${dollars(tolerance, 2)} imputables à l’arrondi.`}
      </span>
    </p>
  )
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [vault, strategies] = await Promise.all([
    callBackend<Vault>('vault'),
    callBackend<Strategies>('vault-strategies'),
  ])

  const v = vault.ok ? vault.data : null
  const snap = v?.snapshot?.value
  const cap = v?.capacity?.value

  const liste = strategies.ok ? strategies.data.strategies?.value : null
  const actives = liste === null || liste === undefined ? [] : liste.filter((s) => !s.isIdle)

  const poches: PocheAllocation[] = actives.map((s) => ({
    poche: s.pocket,
    cible: s.targetBps / 100,
    reel: s.actualBps === null ? null : s.actualBps / 100,
  }))

  // Seules les poches dont l'écart est réellement lu entrent dans le graphique :
  // une poche sans écart lisible n'est pas une poche à écart nul.
  const ecarts: EcartPoche[] = actives.flatMap((s) => {
    if (s.driftBps === null || !Number.isFinite(s.driftBps)) return []
    const points = s.driftBps / 100
    const niveau = niveauEcart(points)
    return [{ poche: s.pocket, label: s.label, ecart: points, niveau, mot: NIVEAU_MOT[niveau] }]
  })

  // Ce que les poches actives couvrent réellement de l'encours. Le complément
  // n'est pas une erreur d'arrondi : c'est de l'argent qui n'est dans aucune
  // poche active, et ça se dit.
  const reels = actives.map((s) => s.actualBps).filter((bps): bps is number => bps !== null)
  const couvertureBps = reels.length > 0 && reels.length === actives.length ? reels.reduce((a, b) => a + b, 0) : null
  const ciblesBps = actives.reduce((a, s) => a + s.targetBps, 0)

  const nbParts = nombreOuNull(snap?.totalShares)
  const valeurPart = nombreOuNull(snap?.navPerShare)
  const encoursAtomique = nombreOuNull(snap?.totalAssets)
  const controleLisible = nbParts !== null && valeurPart !== null && encoursAtomique !== null && nbParts > 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Portefeuille"
        description="L’encours du fonds, la marge avant son plafond, et la conformité de sa répartition aux cibles du contrat."
      />

      <AdminSection>

      {v === null ? (
        <SourceAttendue
          quoi="L’état du portefeuille n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur périmée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-6 lg:col-span-2">
              <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
                <HeroFigure
                  valeur={usdc(snap?.totalAssets)}
                  libelle="Encours du portefeuille"
                  unite={snap?.asset ?? undefined}
                />
                <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4">
                  <SideFact libelle="Valeur d’une part" valeur={snap?.navPerShare ?? '—'} />
                  <SideFact
                    libelle="Parts émises"
                    valeur={nbParts === null ? '—' : nbParts.toLocaleString('fr-FR')}
                  />
                </dl>
              </div>

              {controleLisible ? (
                <ControleCoherence parts={nbParts} valeurPart={valeurPart} encours={encoursAtomique / 1_000_000} />
              ) : null}
            </Card>

            {/* Le plafond n'est plus une jauge plate : le donut porte le plafond
                en son centre, le taux d'utilisation, et surtout les DEUX
                montants — un pourcentage seul ne dit pas combien il reste à
                collecter. Composant déjà en service sur l'accueil : même
                lecture du même fait, à deux endroits. */}
            <Card className="flex flex-col p-6">
              <p className="text-xs tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Plafond de collecte</p>
              <div className="mt-4 flex-1">
                <UtilizationChart
                  tvlCap={cap?.tvlCap}
                  totalAssets={cap?.totalAssets}
                  availableCapacity={cap?.availableCapacity}
                  utilizationBps={cap?.utilizationBps === undefined ? null : cap.utilizationBps}
                />
              </div>
              <p className="mt-4 border-t border-zinc-950/5 pt-3 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
                {cap === null || cap === undefined
                  ? 'La capacité n’a pas été lue : aucun montant n’est affiché plutôt qu’un zéro.'
                  : `Il reste ${usdc(cap.availableCapacity)} de capacité avant le plafond de ${usdc(cap.tvlCap)}.`}
              </p>
            </Card>
          </div>

          <ChartFrame
            question="L’argent est-il placé là où il devrait l’être ?"
            unite="en pourcentage du portefeuille"
            etat={
              poches.length > 0
                ? { type: 'tracee' }
                : { type: 'attendue', explication: 'Aucune stratégie active n’a pu être lue sur la chaîne.' }
            }
          >
            <>
              <AllocationChart poches={poches} />
              {/* Les cibles totalisent 100 % ; les poches constatées, rarement.
                  Le reliquat est de l'encours hors poche active — un fait, pas
                  un arrondi, et il se lit ici plutôt que se calcule de tête. */}
              {couvertureBps === null ? null : (
                <p className="px-5 pb-5 text-xs text-zinc-500 dark:text-zinc-400">
                  Les poches actives couvrent {pourcentBps(couvertureBps)} de l’encours, pour des cibles qui en
                  totalisent {pourcentBps(ciblesBps)} :{' '}
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {pourcentBps(10_000 - couvertureBps)} de l’encours n’est rattaché à aucune poche active.
                  </span>
                </p>
              )}
            </>
          </ChartFrame>

          <ChartFrame
            question="De combien chaque poche s’écarte-t-elle de sa cible ?"
            unite="en points de pourcentage, constatée moins cible"
            etat={
              ecarts.length > 0
                ? { type: 'tracee' }
                : {
                    type: 'attendue',
                    explication:
                      'Aucun écart n’a pu être lu sur la chaîne pour les poches actives.',
                  }
            }
          >
            <VaultEcartChart ecarts={ecarts} />
          </ChartFrame>

          {actives.length > 0 ? <EcartsTable actives={actives} /> : null}
        </>
      )}
      </AdminSection>
    </div>
  )
}
