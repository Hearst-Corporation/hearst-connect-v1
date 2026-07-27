import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { CapacityBar } from '@/components/admin/capacity-bar'
import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
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
 * comme « trois points d'écart ».
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

function usdc(atomique: string | null | undefined, decimales = 0): string {
  if (atomique === null || atomique === undefined || atomique === '') return '—'
  const n = Number(atomique)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: decimales })} $`
}

/** Un écart se lit signé, et son ampleur décide de sa couleur. */
function ecartLisible(driftBps: number | null): { texte: string; ton: string } {
  if (driftBps === null || !Number.isFinite(driftBps)) return { texte: '—', ton: 'text-zinc-500' }
  const pts = driftBps / 100
  const ampleur = Math.abs(pts)
  let ton = 'text-zinc-600'
  if (ampleur >= 5) ton = 'text-zinc-950'
  else if (ampleur >= 1) ton = 'text-zinc-800'
  const signe = pts > 0 ? '+' : ''
  return { texte: `${signe}${pts.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} pt`, ton }
}

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
            <tr className="border-hairline border-b bg-zinc-50 text-left text-xs text-zinc-600">
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
          <tbody className="divide-hairline divide-y">
            {actives.map((s) => {
              const ecart = ecartLisible(s.driftBps)
              return (
                <tr key={s.pocket}>
                  <th scope="row" className="px-5 py-4 text-left font-normal text-zinc-950">
                    {s.label}
                  </th>
                  <td className="px-5 py-4 text-right text-zinc-600 tabular-nums">
                    {(s.targetBps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %
                  </td>
                  <td className="px-5 py-4 text-right text-zinc-950 tabular-nums">
                    {s.actualBps === null
                      ? '—'
                      : `${(s.actualBps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`}
                  </td>
                  <td className={clsx('px-5 py-4 text-right tabular-nums', ecart.ton)}>{ecart.texte}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

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

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        title="Portefeuille"
        description="L’encours du fonds, la marge avant son plafond, et la conformité de sa répartition aux cibles du contrat."
        endpointIds={['vault', 'vault-strategies']}
      />

      {v === null ? (
        <SourceAttendue
          quoi="L’état du portefeuille n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est affichée plutôt qu’une valeur périmée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-3">
            <Card className="p-6 sm:p-8 lg:col-span-2">
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
                    valeur={
                      snap?.totalShares === null || snap?.totalShares === undefined
                        ? '—'
                        : Number(snap.totalShares).toLocaleString('fr-FR')
                    }
                  />
                </dl>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <p className="text-xs tracking-wide text-zinc-600 uppercase">Plafond utilisé</p>
              <div className="mt-3">
                <CapacityBar
                  utiliseBps={cap?.utilizationBps === undefined ? null : cap.utilizationBps}
                  disponible={usdc(cap?.availableCapacity)}
                  total={usdc(cap?.tvlCap)}
                />
              </div>
            </Card>
          </div>

          <ChartFrame
            question="L’argent est-il placé là où il devrait l’être ?"
            unite="en pourcentage du portefeuille"
            provenance="lu sur la chaîne"
            etat={
              poches.length > 0
                ? { type: 'tracee' }
                : { type: 'attendue', explication: 'Aucune stratégie active n’a pu être lue sur la chaîne.' }
            }
          >
            <AllocationChart poches={poches} />
          </ChartFrame>

          {actives.length > 0 ? <EcartsTable actives={actives} /> : null}
        </>
      )}
    </div>
  )
}
