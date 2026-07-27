import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import { CalmState, Card, CardHeader, ExceptionBanner, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import { ilYA, montantUsdc, motifLisible, phraseMouvement } from '@/lib/mouvements'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Accueil' }
export const dynamic = 'force-dynamic'

/**
 * Accueil — le poste de commande.
 *
 * Il répond à trois questions, dans cet ordre : que dois-je traiter
 * maintenant, que se passe-t-il aujourd'hui, y a-t-il un blocage.
 *
 * Le silence est une réponse valide. Quand rien ne réclame d'attention, la
 * première zone se réduit à une ligne calme au lieu d'aligner des compteurs à
 * zéro : un mur de vert est aussi peu lisible qu'un mur de rouge, et il
 * apprend à ignorer l'écran.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }

type Dashboard = {
  readonly capacity?: Resolu<{
    tvlCap: string
    totalAssets: string
    availableCapacity: string
    utilizationBps: number | null
  }>
  readonly performance?: Resolu<{ navPerShare: string | null; totalReturnBps: number | null }>
  readonly strategies?: Resolu<readonly { pocket: string; targetBps: number; actualBps: number | null }[]>
}

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type Evenements = { readonly events?: Resolu<readonly Mouvement[]> }

function pourcentage(bps: number | null | undefined): string {
  if (bps === null || bps === undefined || !Number.isFinite(bps)) return '—'
  return `${(bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
}

const estResolu = (v: unknown): v is Resolu<unknown> =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

export default async function Page() {
  const [dashboard, evenements, disponibilite] = await Promise.all([
    callBackend<Dashboard>('dashboard'),
    callBackend<Evenements>('series1-events', { params: { limit: 5 } }),
    callBackend<{ ready?: boolean }>('ready'),
  ])

  const serviceIndisponible = !disponibilite.ok
  const d = dashboard.ok ? dashboard.data : null

  // Combien de surfaces du produit ne livrent pas de valeur exploitable ?
  // C'est le seul signal d'attention réellement mesurable aujourd'hui : les
  // files de travail, elles, n'ont pas encore de source.
  const surfaces = d === null ? [] : Object.values(d).filter(estResolu)
  const incompletes = surfaces.filter((s) => s.status !== 'LIVE')
  const motif = incompletes.map((s) => motifLisible(s.reason)).find((m) => m !== undefined)

  const capacite = d?.capacity?.value
  const perf = d?.performance?.value

  const strategies = d?.strategies?.value
  const poches: PocheAllocation[] =
    strategies === null || strategies === undefined
      ? []
      : strategies.map((s) => ({
          poche: s.pocket,
          cible: s.targetBps / 100,
          reel: s.actualBps === null ? null : s.actualBps / 100,
        }))

  const mouvements = evenements.ok ? evenements.data.events?.value : null
  const decision = serviceIndisponible
    ? 'Vérifier l’état détaillé du service'
    : incompletes.length > 0
      ? `${incompletes.length} surface${incompletes.length > 1 ? 's' : ''} à examiner`
      : 'Aucune décision immédiate signalée'

  return (
    <div className="space-y-14">
      <PageHeader
        title="Accueil"
        description="Ce qui vous attend, puis l’état du fonds. Toute valeur provient du service ; rien n’est calculé ici."
      />

      {serviceIndisponible ? (
        <ExceptionBanner
          message="Le service ne répond pas. Les valeurs ci-dessous peuvent être incomplètes ou absentes."
          href="/admin/administration"
          actionLabel="Voir l’état détaillé"
        />
      ) : null}

      {/* ── A. Situation immédiate ──────────────────────────────────────── */}
      <section
        aria-labelledby="situation"
        className="grid min-h-104 gap-10 bg-black px-6 py-10 text-white md:grid-cols-[1.25fr_0.75fr] md:px-10 md:py-14"
      >
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-metadata text-accent-400 tracking-[0.14em] uppercase">Situation actuelle</p>
            <h2 id="situation" className="text-section-title mt-8 max-w-3xl text-white">
              Encours du portefeuille
            </h2>
            <p className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-numeric-display text-white tabular-nums">
                {montantUsdc(capacite?.totalAssets, 0)}
              </span>
              <span className="text-body text-zinc-400">USDC</span>
            </p>
          </div>
          <p className="text-label mt-10 max-w-xl text-zinc-400">
            {d === null
              ? 'L’état du fonds n’a pas pu être lu. Aucune valeur de remplacement n’est affichée.'
              : 'Valeur transmise par le service, sans estimation côté interface.'}
          </p>
        </div>
        <div className="flex flex-col justify-between border-t border-white/30 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-8">
          <div>
            <p className="text-metadata tracking-[0.12em] text-zinc-400 uppercase">Décision attendue</p>
            <p className="mt-4 text-2xl leading-tight text-white">{decision}</p>
            {motif ? <p className="text-label mt-3 text-zinc-400">Motif principal : {motif}.</p> : null}
          </div>
          <p className="text-metadata mt-10 text-zinc-500">
            {surfaces.length > 0 ? `${surfaces.length} surfaces observées` : 'Aucune surface lisible'}
          </p>
        </div>
      </section>

      <section aria-labelledby="indicateurs">
        <h2 id="indicateurs" className="text-metadata tracking-[0.12em] text-zinc-600 uppercase">
          Indicateurs secondaires
        </h2>
        <dl className="mt-5 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          <SideFact libelle="Plafond utilisé" valeur={pourcentage(capacite?.utilizationBps)} />
          <SideFact libelle="Valeur d’une part" valeur={perf?.navPerShare ?? '—'} />
          <SideFact libelle="Rendement depuis l’origine" valeur={pourcentage(perf?.totalReturnBps)} />
          <SideFact libelle="Capacité restante" valeur={montantUsdc(capacite?.availableCapacity, 0)} />
        </dl>
      </section>

      <SourceAttendue
        quoi="Les files de travail ne sont pas encore ouvertes"
        detail="Dossiers de conformité à instruire et virements à valider apparaîtront ici dès que le service les transmettra. Aucun compteur n’est avancé d’ici là : un zéro signifierait « rien à traiter », ce que personne ne peut affirmer aujourd’hui."
        requis={[
          'La lecture des dossiers de connaissance client en attente',
          'La lecture des demandes de validation financière',
        ]}
      />

      {/* ── B. Où l'argent est placé ────────────────────────────────────── */}
      {poches.length > 0 ? (
        <Card>
          <CardHeader
            title="L’argent est-il placé là où il devrait l’être ?"
            hint="Allocation visée et allocation constatée, en pourcentage du portefeuille"
          />
          <AllocationChart poches={poches} />
        </Card>
      ) : null}

      {/* ── C. Fil du jour ──────────────────────────────────────────────── */}
      <section aria-labelledby="fil" className="space-y-3">
        <h2 id="fil" className="text-section-title text-black">
          Fil du jour
        </h2>
        {mouvements === null || mouvements === undefined || mouvements.length === 0 ? (
          <CalmState message="Aucun mouvement n’a été relevé récemment." />
        ) : (
          <Card>
            <ul className="divide-y divide-zinc-200">
              {mouvements.map((m) => (
                <li key={m.id} className="text-label flex flex-wrap items-baseline gap-x-3 gap-y-2 py-5">
                  <span className="text-zinc-800">{phraseMouvement(m.eventName)}</span>
                  {m.assetAmountAtomic !== null ? (
                    <span className="font-medium text-black tabular-nums">{montantUsdc(m.assetAmountAtomic, 2)}</span>
                  ) : null}
                  <span className="text-metadata ml-auto text-zinc-600">{ilYA(m.occurredAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ── D. État du service ──────────────────────────────────────────── */}
      <p className="text-metadata flex items-center gap-3 border-t border-zinc-300 pt-4 text-zinc-600">
        <span aria-hidden="true" className={`h-px w-8 ${serviceIndisponible ? 'bg-danger-600' : 'bg-success-600'}`} />
        {serviceIndisponible ? 'Service indisponible' : 'Service disponible'}
      </p>
    </div>
  )
}
