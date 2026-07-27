import { AllocationChart, type PocheAllocation } from '@/components/admin/allocation-chart'
import {
  CalmState,
  Card,
  CardHeader,
  ExceptionBanner,
  HeroFigure,
  SideFact,
  SourceAttendue,
  VerdictCard,
} from '@/components/admin/cockpit'
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


function CeQuiVousAttend({
  incompletes,
  surfaces,
  motif,
  serviceIndisponible,
}: Readonly<{
  incompletes: readonly Resolu<unknown>[]
  surfaces: readonly Resolu<unknown>[]
  motif: string | undefined
  serviceIndisponible: boolean
}>) {
  if (incompletes.length === 0 && !serviceIndisponible) {
    return <CalmState message="Rien ne demande votre attention. Toutes les surfaces du produit répondent." />
  }
  if (incompletes.length === 0) return null
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <VerdictCard
        titre="Surfaces sans donnée"
        compte={String(incompletes.length)}
        unite={`sur ${surfaces.length}`}
        contexte="Ces surfaces répondent, mais sans valeur exploitable."
        casUrgent={motif === undefined ? undefined : `Le plus souvent, ${motif}.`}
        ton="attention"
        href="/admin/dashboard"
        actionLabel="Examiner le détail"
      />
    </div>
  )
}

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

  return (
    <div className="space-y-8">
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

      {/* ── A. Ce qui vous attend ───────────────────────────────────────── */}
      <section aria-labelledby="attente" className="space-y-4">
        <h2 id="attente" className="text-sm font-semibold text-white">
          Ce qui vous attend
        </h2>

        <CeQuiVousAttend
          incompletes={incompletes}
          surfaces={surfaces}
          motif={motif}
          serviceIndisponible={serviceIndisponible}
        />

        <SourceAttendue
          quoi="Les files de travail ne sont pas encore ouvertes"
          detail="Dossiers de conformité à instruire et virements à valider apparaîtront ici dès que le service les transmettra. Aucun compteur n’est avancé d’ici là : un zéro signifierait « rien à traiter », ce que personne ne peut affirmer aujourd’hui."
          requis={[
            'La lecture des dossiers de connaissance client en attente',
            'La lecture des demandes de validation financière',
          ]}
        />
      </section>

      {/* ── B. Le fonds aujourd'hui ─────────────────────────────────────── */}
      <section aria-labelledby="fonds" className="space-y-3">
        <h2 id="fonds" className="text-sm font-semibold text-white">
          Le fonds aujourd’hui
        </h2>

        {d === null ? (
          <SourceAttendue
            quoi="L’état du fonds n’a pas pu être lu"
            detail="Le service n’a pas répondu à la demande d’état du fonds. Aucune valeur n’est affichée plutôt qu’une valeur périmée."
            requis={['Une réponse du service']}
          />
        ) : (
          <Card className="p-6">
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
              <HeroFigure valeur={montantUsdc(capacite?.totalAssets, 0)} libelle="Encours du portefeuille" unite="USDC" />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                <SideFact libelle="Plafond utilisé" valeur={pourcentage(capacite?.utilizationBps)} />
                <SideFact libelle="Valeur d’une part" valeur={perf?.navPerShare ?? '—'} />
                <SideFact libelle="Rendement depuis l’origine" valeur={pourcentage(perf?.totalReturnBps)} />
                {/*
                 * « Mois d'électricité couverts » a été RETIRÉ d'ici.
                 *
                 * Le service calcule cette durée en divisant `reserve.reserveUsdc`
                 * par la facture mensuelle. Or ce champ vaut exactement
                 * `capacity.totalAssets` — vérifié en production, au centime près.
                 * Ce n'est donc pas une trésorerie dédiée à l'électricité : c'est
                 * l'encours entier du fonds, argent des investisseurs compris.
                 *
                 * Le nombre était juste arithmétiquement et faux sémantiquement :
                 * il laissait croire à une réserve d'exploitation qui n'existe pas.
                 * Un chiffre exact qui affirme une chose fausse est plus dangereux
                 * qu'une case vide, parce qu'on le cite en réunion.
                 */}
                <SideFact libelle="Capacité restante" valeur={montantUsdc(capacite?.availableCapacity, 0)} />
              </dl>
            </div>
          </Card>
        )}
      </section>

      {/* ── C. Où l'argent est placé ────────────────────────────────────── */}
      {poches.length > 0 ? (
        <Card>
          <CardHeader
            title="L’argent est-il placé là où il devrait l’être ?"
            hint="Allocation visée et allocation constatée, en pourcentage du portefeuille"
          />
          <AllocationChart poches={poches} />
        </Card>
      ) : null}

      {/* ── D. Fil du jour ──────────────────────────────────────────────── */}
      <section aria-labelledby="fil" className="space-y-3">
        <h2 id="fil" className="text-sm font-semibold text-white">
          Fil du jour
        </h2>
        {mouvements === null || mouvements === undefined || mouvements.length === 0 ? (
          <CalmState message="Aucun mouvement n’a été relevé récemment." />
        ) : (
          <Card>
            <ul className="divide-y divide-white/[0.07]">
              {mouvements.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline gap-x-2 px-5 py-3 text-sm">
                  <span className="text-zinc-200">{phraseMouvement(m.eventName)}</span>
                  {m.assetAmountAtomic !== null ? (
                    <span className="font-semibold text-accent-300 tabular-nums">{montantUsdc(m.assetAmountAtomic, 2)}</span>
                  ) : null}
                  <span className="ml-auto text-xs text-zinc-400">{ilYA(m.occurredAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {/* ── E. État du service ──────────────────────────────────────────── */}
      <p className="flex items-center gap-2 text-xs text-zinc-400">
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${serviceIndisponible ? 'bg-danger-500' : 'bg-success-500'}`}
        />
        {serviceIndisponible ? 'Service indisponible' : 'Service disponible'}
      </p>
    </div>
  )
}
