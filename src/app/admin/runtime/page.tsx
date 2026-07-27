import { Card, CardHeader } from '@/components/admin/cockpit'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'État du service' }
export const dynamic = 'force-dynamic'

/**
 * État du service — le jargon traduit une fois, ici.
 *
 * Cette page est la frontière du produit : c'est le dernier endroit où l'on
 * accepte de voir un vocabulaire machine, et elle a pour rôle de le traduire
 * pour que personne n'ait à le faire ailleurs. `RUNNING`, `NOT_CONFIGURED`,
 * `CONFIGURED` deviennent des phrases ; la réponse brute reste consultable
 * en dessous, repliée, pour qui veut vérifier un champ.
 */

type Runtime = {
  readonly databaseStatus?: string
  readonly contractStatus?: string
  readonly indexerStatus?: string
  readonly environment?: string
  readonly uptimeSeconds?: number
  readonly db?: { readonly reachable?: boolean; readonly latencyMs?: number | null }
  readonly indexerScheduler?: {
    readonly status?: string
    readonly intervalMs?: number | null
    readonly lastSuccessAt?: string | null
    readonly consecutiveErrors?: number
    readonly lastIndexedBlock?: number | null
  }
}

type Ton = 'sain' | 'attention' | 'critique' | 'neutre'

const POINT: Record<Ton, string> = {
  sain: 'bg-zinc-950',
  attention: 'bg-zinc-600',
  critique: 'bg-zinc-950',
  neutre: 'bg-zinc-300',
}

/** Chaque état machine connu reçoit une phrase. Un inconnu reste neutre. */
function lireEtat(brut: string | undefined): { texte: string; ton: Ton } {
  switch (brut) {
    case 'ready':
      return { texte: 'Base de données joignable', ton: 'sain' }
    case 'CONFIGURED':
      return { texte: 'Contrat configuré', ton: 'sain' }
    case 'RUNNING':
      return { texte: 'Relevé des mouvements en cours', ton: 'sain' }
    case 'NOT_CONFIGURED':
      return { texte: 'Pas encore configuré', ton: 'attention' }
    case 'unreachable':
      return { texte: 'Injoignable', ton: 'critique' }
    case undefined:
      return { texte: 'Non communiqué', ton: 'neutre' }
    default:
      return { texte: 'État non reconnu', ton: 'neutre' }
  }
}

function duree(secondes: number | undefined): string {
  if (secondes === undefined || !Number.isFinite(secondes)) return '—'
  if (secondes < 120) return `${Math.round(secondes)} s`
  const minutes = Math.round(secondes / 60)
  if (minutes < 120) return `${minutes} min`
  return `${Math.round(minutes / 60)} h`
}

function etatPlanificateur(statut: string | undefined): { texte: string; ton: Ton } {
  if (statut === 'running') return { texte: 'Actif', ton: 'sain' }
  if (statut === 'disabled') return { texte: 'Désactivé', ton: 'attention' }
  return { texte: 'Non communiqué', ton: 'neutre' }
}

function precisionErreurs(erreurs: number | undefined): string | undefined {
  if (erreurs === undefined) return undefined
  if (erreurs > 0) return `${erreurs} erreur${erreurs > 1 ? 's' : ''} d’affilée`
  return 'aucune erreur'
}

function Ligne({
  libelle,
  etat,
  precision,
}: Readonly<{ libelle: string; etat: ReturnType<typeof lireEtat>; precision?: string }>) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
      <span aria-hidden="true" className={clsx('h-px w-4 shrink-0 self-center', POINT[etat.ton])} />
      <span className="text-sm text-zinc-600">{libelle}</span>
      <span className="text-sm text-zinc-950">{etat.texte}</span>
      {precision !== undefined ? <span className="ml-auto text-xs text-zinc-600 tabular-nums">{precision}</span> : null}
    </li>
  )
}

function SanteService({ r }: Readonly<{ r: Runtime | null }>) {
  const hint =
    r === null
      ? 'Le service n’a pas répondu'
      : `En fonctionnement depuis ${duree(r.uptimeSeconds)} · environnement ${r.environment ?? 'non communiqué'}`

  return (
    <Card>
      <CardHeader title="Le service est-il en bonne santé ?" hint={hint} />
      {r === null ? <EtatIndisponible /> : <ListeEtats r={r} />}
    </Card>
  )
}

function EtatIndisponible() {
  return (
    <p className="px-6 py-10 text-sm text-zinc-700 sm:px-8">
      Le service n’a pas répondu à la demande d’état. Aucun état n’est supposé.
    </p>
  )
}

function ListeEtats({ r }: Readonly<{ r: Runtime }>) {
  const base = lireEtat(r.databaseStatus)
  const contrat = lireEtat(r.contractStatus)
  const releve = lireEtat(r.indexerStatus)
  const planificateur = r.indexerScheduler

  const latence = r.db?.latencyMs
  const erreurs = planificateur?.consecutiveErrors
  const bloc = planificateur?.lastIndexedBlock

  return (
    <ul className="divide-hairline divide-y">
      <Ligne
        libelle="Base de données"
        etat={base}
        precision={latence === null || latence === undefined ? undefined : `${latence} ms`}
      />
      <Ligne libelle="Contrat" etat={contrat} />
      <Ligne
        libelle="Relevé des mouvements"
        etat={releve}
        precision={bloc === null || bloc === undefined ? undefined : `bloc ${bloc.toLocaleString('fr-FR')}`}
      />
      <Ligne
        libelle="Planificateur"
        etat={etatPlanificateur(planificateur?.status)}
        precision={precisionErreurs(erreurs)}
      />
    </ul>
  )
}

export default async function RuntimePage() {
  const reponse = await callBackend<Runtime>('runtime')
  const r = reponse.ok ? reponse.data : null

  return (
    <div className="space-y-8 sm:space-y-10">
      <PageHeader
        title="État du service"
        description="Ce que le service dit de lui-même, traduit. Une valeur inconnue reste inconnue : elle n’est jamais rendue comme un zéro."
        endpointIds={['health', 'ready', 'runtime']}
      />

      <SanteService r={r} />

      {/* La réponse brute reste consultable : c'est le sous-sol, et on y descend
          volontairement plutôt que d'y être déposé. */}
      <EndpointSection endpointId="runtime" title="Réponse détaillée du service" />
      <div className="grid gap-8 lg:grid-cols-2">
        <EndpointSection endpointId="health" title="Sonde de vivacité" />
        <EndpointSection endpointId="ready" title="Sonde de disponibilité" />
      </div>
    </div>
  )
}
