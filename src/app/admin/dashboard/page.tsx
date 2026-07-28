import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { CockpitSection } from '@/components/admin/cockpit-section'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import clsx from 'clsx'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Couverture des données' }
export const dynamic = 'force-dynamic'

/**
 * Couverture des données — quelles surfaces du produit sont réellement servies.
 *
 * L'agrégat renvoyé par le service décrit dix-huit surfaces métier, chacune
 * avec son propre état. C'est LA question à laquelle cette page répond : sur
 * quoi peut-on s'appuyer aujourd'hui, et ce qui manque ailleurs, pourquoi.
 *
 * Deux choix la gouvernent :
 *
 * 1. On ne montre pas la charge utile brute en premier plan. Un écran de JSON
 *    n'apprend rien à qui doit décider ; il reste consultable en bas de page.
 *
 * 2. On ne requalifie aucun état. Le service calcule l'état d'ensemble
 *    pire-champ-d'abord : une seule surface dégradée abaisse le tout. C'est un
 *    comportement documenté, on l'explique plutôt que de le corriger — un
 *    frontend qui « améliore » un état amont ment à son lecteur.
 */

type Resolu = { readonly status: string; readonly value: unknown; readonly reason?: string | null }

const estResolu = (v: unknown): v is Resolu =>
  typeof v === 'object' && v !== null && 'status' in v && 'value' in v

/** Le nom métier de chaque surface. Une clé inconnue garde sa clé. */
const NOM_SURFACE: Record<string, string> = {
  identity: 'Identité de l’investisseur',
  position: 'Position détenue',
  distributions: 'Distributions versées',
  activity: 'Activité du compte',
  proofs: 'Preuves de réserve',
  allocation: 'Répartition du portefeuille',
  subscription: 'Conditions de souscription',
  alerts: 'Alertes en cours',
  capacity: 'Capacité du fonds',
  reserve: 'Réserve de trésorerie',
  performance: 'Performance',
  mining: 'Production de la flotte',
  rebalancing: 'Rééquilibrage',
  vault: 'Portefeuille d’actifs',
  strategies: 'Stratégies actives',
  recentEvents: 'Derniers mouvements',
  engine: 'Moteur de minage',
  aiExperts: 'Analyse assistée',
}

const nomSurface = (cle: string): string => NOM_SURFACE[cle] ?? cle

/* ── Les trois familles d'état ───────────────────────────────────────────── */

type Famille = 'servie' | 'partielle' | 'absente'

const FAMILLE_TITRE: Record<Famille, string> = {
  servie: 'Servies',
  partielle: 'Partiellement servies',
  absente: 'Pas encore ouvertes',
}

const FAMILLE_EXPLICATION: Record<Famille, string> = {
  servie: 'Ces surfaces renvoient une valeur exploitable. On peut s’y appuyer.',
  partielle:
    'Ces surfaces répondent, mais sans valeur : le service sait quoi renvoyer, il n’a simplement rien à dire aujourd’hui.',
  absente: 'Ces surfaces ne sont pas encore ouvertes. Rien n’est attendu d’elles pour l’instant.',
}

const FAMILLE_POINT: Record<Famille, string> = {
  servie: 'bg-success-500',
  partielle: 'bg-warning-500',
  absente: 'bg-zinc-600',
}

const FAMILLE_TEXTE: Record<Famille, string> = {
  servie: 'text-success-400',
  partielle: 'text-warning-400',
  absente: 'text-zinc-400',
}

/** Le classement suit l'état déclaré par le service, sans le réinterpréter. */
function familleDe(statut: string): Famille {
  if (statut === 'LIVE') return 'servie'
  if (statut === 'PARTIAL' || statut === 'STALE' || statut === 'SNAPSHOT' || statut === 'EMPTY') return 'partielle'
  return 'absente'
}

const ORDRE: readonly Famille[] = ['servie', 'partielle', 'absente']

type Surface = { readonly cle: string; readonly nom: string; readonly famille: Famille; readonly motif: string | undefined }

function CouvertureDonnees({ surfaces }: Readonly<{ surfaces: readonly Surface[] }>) {
  const servies = surfaces.filter((s) => s.famille === 'servie')
  const partielles = surfaces.filter((s) => s.famille === 'partielle')
  const absentes = surfaces.filter((s) => s.famille === 'absente')

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <HeroFigure valeur={`${servies.length}`} libelle="Surfaces servies" unite={`sur ${surfaces.length}`} />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SideFact
              libelle="Partiellement servies"
              valeur={partielles.length === 0 ? 'aucune' : String(partielles.length)}
            />
            <SideFact
              libelle="Pas encore ouvertes"
              valeur={absentes.length === 0 ? 'aucune' : String(absentes.length)}
            />
            <SideFact libelle="Couverture" valeur={`${Math.round((servies.length / surfaces.length) * 100)} %`} />
          </dl>
        </div>

        {/* Une seule barre, trois segments : la proportion se saisit d'un
            coup d'œil, sans lire trois nombres puis les comparer. */}
        <div className="mt-6 flex h-2 gap-0.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          {ORDRE.map((famille) => {
            const nombre = surfaces.filter((s) => s.famille === famille).length
            if (nombre === 0) return null
            return (
              <div
                key={famille}
                className={clsx('h-full', FAMILLE_POINT[famille])}
                style={{ width: `${(nombre / surfaces.length) * 100}%` }}
              />
            )
          })}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          L’état d’ensemble annoncé par le service se lit au pire des champs : une seule surface incomplète
          abaisse l’ensemble. C’est voulu — il vaut mieux une alerte de trop qu’un écran faussement rassurant.
        </p>
      </Card>

      {ORDRE.map((famille) => {
        const lot = surfaces.filter((s) => s.famille === famille)
        if (lot.length === 0) return null
        return (
          <Card key={famille}>
            <CardHeader title={`${FAMILLE_TITRE[famille]} — ${lot.length}`} hint={FAMILLE_EXPLICATION[famille]} />
            <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
              {lot.map((surface) => (
                <li key={surface.cle} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
                  <span
                    aria-hidden="true"
                    className={clsx('size-1.5 shrink-0 self-center rounded-full', FAMILLE_POINT[famille])}
                  />
                  <span className="text-sm text-white">{surface.nom}</span>
                  {surface.motif === undefined ? null : (
                    <span className={clsx('ml-auto text-xs', FAMILLE_TEXTE[famille])}>{surface.motif}</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </>
  )
}

function CorpsCouverture({
  agregat,
  surfaces,
}: Readonly<{ agregat: Record<string, unknown> | null; surfaces: readonly Surface[] }>) {
  if (agregat === null) {
    return (
      <SourceAttendue
        quoi="L’état des surfaces n’a pas pu être lu"
        detail="Le service n’a pas répondu. Aucune couverture n’est supposée : afficher « tout va bien » sans réponse serait le pire des mensonges sur cet écran."
        requis={['Une réponse du service']}
      />
    )
  }
  if (surfaces.length === 0) {
    return (
      <SourceAttendue
        quoi="Le service n’a décrit aucune surface"
        detail="La réponse est arrivée, mais elle ne contient aucune surface exploitable. Rien n’est déduit de ce silence."
        requis={['Une réponse décrivant l’état de chaque surface']}
      />
    )
  }
  return <CouvertureDonnees surfaces={surfaces} />
}

export default async function Page() {
  const reponse = await callBackend<Record<string, unknown>>('dashboard')
  const agregat = reponse.ok ? reponse.data : null

  const surfaces =
    agregat === null
      ? []
      : Object.entries(agregat)
          .filter((entree): entree is [string, Resolu] => estResolu(entree[1]))
          .map(([cle, resolu]) => ({
            cle,
            nom: nomSurface(cle),
            famille: familleDe(resolu.status),
            motif: motifLisible(resolu.reason),
          }))

  return (
    <div className="space-y-8">
      <PageHeader
        title="Couverture des données"
        description="Sur quoi le produit peut s’appuyer aujourd’hui, surface par surface, et pourquoi le reste attend encore sa source."
      />

      <CockpitSection>

      <CorpsCouverture agregat={agregat} surfaces={surfaces} />

      {/* Le sous-sol : la réponse détaillée pour qui veut vérifier un champ. */}
      </CockpitSection>
    </div>
  )
}
