import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Minage' }
export const dynamic = 'force-dynamic'

/**
 * Minage — ce que la flotte produit, ce qu'elle coûte, si elle tourne.
 *
 * Trois routes alimentaient trois blocs bruts. Elles répondent en réalité à
 * deux questions seulement : que produit la flotte, et l'électricité est-elle
 * couverte. Le bridage et le cycle mensuel ne sont pas des mesures mais des
 * états d'exploitation : ils se lisent en phrases, pas en chiffres.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Mining = {
  readonly hashrate?: Resolu<{ reportedHashrateTh: string; lastReportTime: string | null }>
  readonly btcEarned?: Resolu<{ totalBtcEarnedSats: string }>
  readonly electricity?: Resolu<{ monthlyCost: string }>
  readonly curtailment?: Resolu<{ fleetActive: boolean | null; curtailed: boolean | null }>
}

function usdc(v: string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $`
}

function dateLisible(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default async function Page() {
  const reponse = await callBackend<Mining>('mining')
  const m = reponse.ok ? reponse.data : null

  const hashrate = m?.hashrate?.value
  const sats = m?.btcEarned?.value?.totalBtcEarnedSats
  const elec = m?.electricity?.value
  const exploitation = m?.curtailment?.value

  const bitcoin =
    sats === null || sats === undefined
      ? '—'
      : (Number(sats) / 100_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 4 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minage"
        description="Ce que la flotte produit, ce qu’elle coûte, et si elle tourne."
        endpointIds={['mining', 'mining-onchain', 'mining-electricity']}
      />

      {m === null ? (
        <SourceAttendue
          quoi="L’état du minage n’a pas pu être lu"
          detail="Le service n’a pas répondu. Aucune valeur n’est supposée."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure
                valeur={
                  hashrate === null || hashrate === undefined
                    ? '—'
                    : Number(hashrate.reportedHashrateTh).toLocaleString('fr-FR')
                }
                libelle="Puissance de calcul déclarée"
                unite="TH/s"
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <SideFact libelle="Bitcoin produit" valeur={`${bitcoin} BTC`} />
                <SideFact libelle="Électricité mensuelle" valeur={usdc(elec?.monthlyCost)} />
                <SideFact libelle="Dernier relevé" valeur={dateLisible(hashrate?.lastReportTime)} />
              </dl>
            </div>
          </Card>

          <Card>
            <CardHeader title="La flotte tourne-t-elle ?" hint="État d’exploitation déclaré par le contrat" />
            <ul className="divide-y divide-white/[0.07]">
              <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                <span className="w-24 shrink-0 text-zinc-400">Flotte</span>
                <span className="text-white">
                  {exploitation?.fleetActive === true
                    ? 'En fonctionnement'
                    : exploitation?.fleetActive === false
                      ? 'À l’arrêt'
                      : 'Non communiqué'}
                </span>
              </li>
              <li className="flex items-baseline gap-3 px-5 py-3.5 text-sm">
                <span className="w-24 shrink-0 text-zinc-400">Bridage</span>
                <span className="text-white">
                  {exploitation?.curtailed === true
                    ? 'Actif — la production est volontairement réduite'
                    : exploitation?.curtailed === false
                      ? 'Inactif'
                      : 'Non communiqué'}
                </span>
              </li>
            </ul>
          </Card>

          <ChartFrame
            question="Comment la puissance de calcul évolue-t-elle ?"
            unite="en TH/s, par relevé"
            provenance="télémétrie d’exploitation"
            etat={{
              type: 'attendue',
              explication:
                'Le service ne transmet qu’un relevé instantané, sans historique. Une courbe exigerait une série conservée dans le temps : elle n’existe pas encore.',
            }}
            hauteur="h-44"
          />
        </>
      )}
    </div>
  )
}
