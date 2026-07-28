import { ChartFrame, type EtatSerie } from '@/components/admin/chart-frame'
import { Card, CardHeader, HeroFigure, SideFact } from '@/components/admin/cockpit'
import { DerivePochesChart, type DerivePoche } from '@/components/admin/derive-poches-chart'
import { DistributionBarChart } from '@/components/admin/distribution-chart'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSurfaceHeader } from '@/components/admin/typography'
import {
  AdminErrorState,
  AdminMetric,
  AdminSection,
  AdminSourceAttendue,
  AdminStatus,
  AdminSurface,
  AdminTable,
  type AdminTableColumn,
} from '@/components/admin/surfaces'
import { callBackend, type BackendResult } from '@/lib/backend/client'
import { explorerTxUrl } from '@/lib/explorer'
import {
  adresseCourte,
  dateLisible,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import { formatCount } from '@/lib/resolved'
import { etatSerieDe } from '@/lib/serie-etat'
import { statutAffichage } from '@/lib/statut-affichage'
import clsx from 'clsx'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Opérations' }
export const dynamic = 'force-dynamic'

/**
 * Opérations — ce qui s'est passé, ce qui a dérivé, ce qui attend un geste.
 *
 * La page répondait à « que renvoie la route ? » : l'état du rééquilibrage y
 * était déversé en JSON brut dans un dépliant. Un opérateur n'a pas à lire une
 * enveloppe pour savoir s'il doit agir. Trois questions la structurent
 * désormais :
 *
 *   01. Faut-il rééquilibrer ? — l'écart à la cible, poche par poche.
 *   02. Que s'est-il passé sur la chaîne ? — le registre, en fil et en table.
 *   03. Le registre est-il à jour ? — l'état réel de l'indexeur.
 *   04. Qu'est-ce qui attend une validation ? — rien, et on dit pourquoi.
 *
 * ── Deux sources pour un même sujet, et c'est voulu ────────────────────────
 * `GET /api/v1/rebalancing/status` est la lecture DIRECTE du contrat : elle
 * répond aujourd'hui UNAVAILABLE / `not_exposed_by_contract`. Le contrat
 * déployé n'expose tout simplement aucun état de rééquilibrage. La page le dit
 * en toutes lettres au lieu de laisser deviner ce vide.
 *
 * Ce qu'on sait malgré tout vient de l'INDEXEUR, via `GET /api/v1/dashboard`
 * (`rebalancing` et `allocation`, tous deux LIVE) : date du dernier
 * rééquilibrage, écart constaté, et le détail signé poche par poche. Les deux
 * provenances sont affichées séparément — les confondre reviendrait à faire
 * passer une donnée indexée pour une lecture on-chain.
 *
 * ── Ce qui n'est PAS tracé ─────────────────────────────────────────────────
 * Le délai entre `occurredAt` et `indexedAt` serait facile à mettre en courbe,
 * mais le premier lot d'événements a été rattrapé après coup : la série
 * mélangerait un backfill et un régime nominal, et se lirait « l'indexeur a
 * des heures de retard ». La fraîcheur de l'indexation est donc lue là où elle
 * est mesurée — le planificateur exposé par `GET /api/v1/runtime` — et non
 * déduite du registre.
 *
 * Aucun seuil de déclenchement du rééquilibrage n'est publié par le service :
 * la page donne l'écart brut et ne dessine aucune ligne rouge inventée.
 */

/* ── Formes réelles des réponses ──────────────────────────────────────────── */

type MouvementIndexe = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber: string
  readonly txHash: string
  readonly investorAddress: string | null
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type Resolu<T> = {
  readonly status: string
  readonly value: T | null
  readonly reason?: string | null
  readonly provenance?: string | null
}

type ReponseEvenements = {
  readonly events?: Resolu<readonly MouvementIndexe[]>
}

/** Bloc `runtime` embarqué dans la réponse de `rebalancing/status`. */
type RuntimeContrat = {
  readonly mode?: string | null
  readonly chainId?: number | null
  readonly contractAddress?: string | null
  readonly codePresence?: string | null
  readonly indexerLagBlocks?: number | null
}

type RebalancingStatus = {
  readonly runtime?: RuntimeContrat
  readonly rebalancing?: Resolu<unknown>
}

type Poche = {
  readonly pocket: string
  readonly label?: string | null
  readonly targetBps?: number | null
  readonly actualBps?: number | null
  readonly driftBps?: number | null
}

type Dashboard = {
  readonly rebalancing?: Resolu<{
    readonly lastRebalanceAt?: string | null
    readonly driftBps?: number | null
    readonly pending?: unknown
  }>
  readonly allocation?: Resolu<{ readonly pockets?: readonly Poche[] }>
}

type Runtime = {
  readonly contract?: RuntimeContrat
  readonly indexer?: { readonly status?: string | null; readonly lastSyncedAt?: string | null }
  readonly indexerStatus?: string | null
  readonly indexerScheduler?: {
    readonly status?: string | null
    readonly intervalMs?: number | null
    readonly lastRunAt?: string | null
    readonly lastSuccessAt?: string | null
    readonly consecutiveErrors?: number | null
    readonly lastIndexedBlock?: string | null
  }
  readonly db?: { readonly reachable?: boolean | null; readonly latencyMs?: number | null }
}

/* ── Formats ──────────────────────────────────────────────────────────────── */

function instantDe(iso: string | null | undefined): number | null {
  if (iso === null || iso === undefined || iso === '') return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : t
}

function jourLisible(iso: string | null): string {
  const t = instantDe(iso)
  if (t === null) return 'Date inconnue'
  return new Date(t).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function heureLisible(iso: string | null): string {
  const t = instantDe(iso)
  if (t === null) return '—'
  return new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/** Un écart en points de base se lit en points de pourcentage, jamais brut. */
function ecartLisible(bps: number | null | undefined): string {
  if (typeof bps !== 'number' || !Number.isFinite(bps)) return '—'
  return (bps / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
}

/** Entier de chaîne → BigInt. Une valeur illisible n'est pas comptée. */
function entierAtomique(valeur: string | null | undefined): bigint | null {
  if (valeur === null || valeur === undefined || valeur === '') return null
  try {
    return BigInt(valeur)
  } catch {
    return null
  }
}

function nombreDeChaine(valeur: string | null | undefined): string {
  const entier = entierAtomique(valeur)
  return entier === null ? '—' : entier.toLocaleString('fr-FR')
}

/** Un identifiant de chaîne n'est pas une quantité : pas de séparateur. */
function chaineLisible(chainId: number | null | undefined): string {
  if (typeof chainId !== 'number' || !Number.isFinite(chainId)) return '—'
  return String(chainId)
}

function retardLisible(blocs: number | null | undefined): string {
  if (typeof blocs !== 'number' || !Number.isFinite(blocs)) {
    return 'Retard d’indexeur : non communiqué par le contrat.'
  }
  return `Retard d’indexeur annoncé par le contrat : ${formatCount(blocs)} bloc(s).`
}

function cadenceLisible(intervalMs: number | null | undefined): string {
  if (typeof intervalMs !== 'number' || !Number.isFinite(intervalMs)) return '—'
  if (intervalMs < 60_000) return `toutes les ${Math.round(intervalMs / 1000)} s`
  return `toutes les ${Math.round(intervalMs / 60_000)} min`
}

/**
 * Motif machine → phrase. Un motif inconnu ne fuit pas tel quel : mieux vaut
 * dire qu'on ne sait pas que d'afficher `not_exposed_by_contract` à l'écran.
 */
function phraseIndisponibilite(motif: string | null | undefined): string {
  const lisible = motifLisible(motif)
  if (lisible !== undefined) return `Raison donnée par le service : ${lisible}.`
  return 'Le service ne précise pas de raison.'
}

/* ── Registre : agrégats réels ────────────────────────────────────────────── */

function trierDuPlusRecent(mouvements: readonly MouvementIndexe[]): readonly MouvementIndexe[] {
  return [...mouvements].sort((a, b) => {
    const ta = instantDe(a.occurredAt)
    const tb = instantDe(b.occurredAt)
    if (ta === null && tb === null) return 0
    if (ta === null) return 1
    if (tb === null) return -1
    return tb - ta
  })
}

type BarreType = { readonly nom: string; readonly valeur: number }

type CumulType = {
  readonly nom: string
  readonly nombre: number
  /** Somme des montants portés par ce type, ou `null` s'il n'en porte aucun. */
  readonly montantAtomique: string | null
}

type Agregat = { nombre: number; total: bigint; avecMontant: number }

function agregerParType(mouvements: readonly MouvementIndexe[]): readonly CumulType[] {
  const parType = new Map<string, Agregat>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    // `BigInt(0)` et non `0n` : la cible de compilation du projet est ES2017,
    // où le littéral BigInt n'existe pas encore.
    const courant = parType.get(nom) ?? { nombre: 0, total: BigInt(0), avecMontant: 0 }
    courant.nombre += 1
    const montant = entierAtomique(m.assetAmountAtomic)
    if (montant !== null) {
      courant.total += montant
      courant.avecMontant += 1
    }
    parType.set(nom, courant)
  }
  return [...parType.entries()].map(([nom, agregat]) => ({
    nom,
    nombre: agregat.nombre,
    montantAtomique: agregat.avecMontant > 0 ? agregat.total.toString() : null,
  }))
}

const barresDe = (cumuls: readonly CumulType[]): readonly BarreType[] =>
  cumuls.map((c) => ({ nom: c.nom, valeur: c.nombre }))

type GroupeJour = { readonly jour: string; readonly mouvements: readonly MouvementIndexe[] }

/** Le fil se lit par journée : c'est ainsi qu'une équipe raconte sa semaine. */
function grouperParJour(mouvements: readonly MouvementIndexe[]): readonly GroupeJour[] {
  const parJour = new Map<string, MouvementIndexe[]>()
  for (const m of mouvements) {
    const jour = jourLisible(m.occurredAt)
    const deja = parJour.get(jour)
    if (deja === undefined) parJour.set(jour, [m])
    else deja.push(m)
  }
  return [...parJour.entries()].map(([jour, liste]) => ({ jour, mouvements: liste }))
}

/* ── Rééquilibrage : dérive poche par poche ───────────────────────────────── */

function derivesDe(poches: readonly Poche[] | null | undefined): readonly DerivePoche[] {
  if (!poches) return []
  const sorties: DerivePoche[] = []
  for (const p of poches) {
    const cible = p.targetBps
    const constate = p.actualBps
    const ecart = p.driftBps
    if (typeof cible !== 'number' || typeof constate !== 'number' || typeof ecart !== 'number') continue
    const intitule = p.label === null || p.label === undefined || p.label === '' ? p.pocket : p.label
    sorties.push({
      poche: `${p.pocket} · ${intitule}`,
      cible: cible / 100,
      constate: constate / 100,
      ecart: ecart / 100,
    })
  }
  return sorties
}

/**
 * État du cadre de dérive.
 *
 * Trois absences distinctes, trois phrases distinctes : le service muet, la
 * source non transmise, et le cas où la répartition arrive mais sans les trois
 * champs nécessaires à un écart. Les confondre reviendrait à faire passer une
 * panne pour une fonctionnalité manquante.
 */
function etatDeriveDe(dashboard: BackendResult<Dashboard>, derives: readonly DerivePoche[]): EtatSerie {
  if (!dashboard.ok) {
    return {
      type: 'indisponible',
      explication: 'Le service n’a pas répondu. Aucune dérive n’est tracée plutôt qu’une valeur périmée.',
    }
  }
  if (derives.length > 0) return { type: 'tracee' }

  const defaut = 'Aucune poche ne remonte à la fois sa cible et sa part constatée.'
  const etat = etatSerieDe(dashboard.data.allocation, defaut)
  return etat.type === 'tracee' ? { type: 'attendue', explication: defaut } : etat
}

/* ── Section 01 · Rééquilibrage ───────────────────────────────────────────── */

function SyntheseDerive({ dashboard }: Readonly<{ dashboard: BackendResult<Dashboard> }>) {
  if (!dashboard.ok) {
    return <AdminErrorState state={dashboard.state} title="Mesure de dérive non lisible" />
  }

  const champ = dashboard.data.rebalancing
  const mesure = champ?.value

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <HeroFigure
          valeur={ecartLisible(mesure?.driftBps)}
          libelle="Écart constaté à l’allocation cible"
          unite="points de %"
        />
        <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <SideFact libelle="Dernier rééquilibrage" valeur={dateLisible(mesure?.lastRebalanceAt)} />
          <SideFact libelle="Ancienneté" valeur={ilYA(mesure?.lastRebalanceAt)} />
          {/* `pending: null` : le service ne remonte aucune demande. On l'écrit
              plutôt que d'afficher « 0 », qui laisserait croire à un compteur. */}
          <SideFact
            libelle="Demande en cours"
            valeur={mesure?.pending === null || mesure?.pending === undefined ? 'Aucune remontée' : 'Une demande est ouverte'}
          />
        </dl>
      </div>
      <p className="mt-5 border-t border-zinc-950/5 pt-4 text-xs text-zinc-500 dark:border-white/5 dark:text-zinc-400">
        Mesure indexée · {statutAffichage(champ?.status)} — aucun seuil de déclenchement n’est publié par le
        service : l’écart est donné brut, la décision reste humaine.
      </p>
    </Card>
  )
}

function LectureOnChain({ rebalancing }: Readonly<{ rebalancing: BackendResult<RebalancingStatus> }>) {
  if (!rebalancing.ok) {
    return <AdminErrorState state={rebalancing.state} title="État du rééquilibrage non lisible" />
  }

  const champ = rebalancing.data.rebalancing
  const contrat = rebalancing.data.runtime
  const lisible = champ?.status === 'LIVE' && champ.value !== null

  return (
    <AdminSurface className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AdminStatus status={statutAffichage(champ?.status)} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Lecture directe du contrat</p>
      </div>

      <p className="mt-3 max-w-2xl text-sm text-zinc-700 dark:text-zinc-300">
        {lisible
          ? 'Le contrat expose un état de rééquilibrage : voir le détail ci-dessous.'
          : 'Le contrat déployé n’expose aucun état de rééquilibrage. Ce n’est pas une panne du service : la capacité de lecture est absente de la source.'}
      </p>
      {lisible ? null : (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{phraseIndisponibilite(champ?.reason)}</p>
      )}

      {/* Ces quatre faits étaient noyés dans le JSON brut : ils disent quel
          contrat a été interrogé, et s'il porte bien du code. */}
      <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 border-t border-zinc-950/5 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/5">
        <SideFact libelle="Mode de contrat" valeur={contrat?.mode ?? '—'} />
        <SideFact libelle="Chaîne" valeur={chaineLisible(contrat?.chainId)} />
        <SideFact libelle="Contrat interrogé" valeur={adresseCourte(contrat?.contractAddress) ?? '—'} />
        <SideFact
          libelle="Code présent à l’adresse"
          valeur={contrat?.codePresence === 'present' ? 'Oui' : (contrat?.codePresence ?? '—')}
        />
      </dl>

      <Link
        href="/admin/keeper"
        className="mt-5 inline-block text-sm text-accent-600 hover:underline dark:text-accent-400"
      >
        Actions keeper (rééquilibrage) →
      </Link>
    </AdminSurface>
  )
}

/* ── Section 02 · Registre ────────────────────────────────────────────────── */

function cellType(m: MouvementIndexe) {
  return <span className="text-zinc-950 dark:text-white">{libelleMouvement(m.eventName)}</span>
}

/**
 * Un tiret n'est pas un montant : il ne porte donc pas la couleur d'accent,
 * réservée aux valeurs réellement chiffrées. Un « — » vert se lisait comme une
 * somme au premier coup d'œil.
 */
function cellMontant(m: MouvementIndexe) {
  if (m.assetAmountAtomic === null) {
    return <span className="text-zinc-500 dark:text-zinc-400">—</span>
  }
  return (
    <span className="font-semibold text-accent-600 tabular-nums dark:text-accent-400">
      {montantUsdc(m.assetAmountAtomic)}
    </span>
  )
}

function cellAdresse(m: MouvementIndexe) {
  return adresseCourte(m.investorAddress) ?? '—'
}

function cellBloc(m: MouvementIndexe) {
  return m.blockNumber
}

function cellDate(m: MouvementIndexe) {
  return <span className="text-zinc-500 dark:text-zinc-400">{dateLisible(m.occurredAt)}</span>
}

function renderTxHash(chainId: number | undefined, txHash: string) {
  const url = explorerTxUrl(chainId, txHash)
  const court = adresseCourte(txHash)
  if (!court) return '—'
  if (!url) return court
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-600 hover:underline dark:text-accent-400"
    >
      {court}
    </a>
  )
}

function colonnesMouvements(chainId: number | undefined): readonly AdminTableColumn<MouvementIndexe>[] {
  return [
    { key: 'type', header: 'Type', cell: cellType },
    { key: 'montant', header: 'Montant', cell: cellMontant },
    { key: 'adresse', header: 'Investisseur', mono: true, cell: cellAdresse },
    { key: 'bloc', header: 'Bloc', mono: true, cell: cellBloc },
    {
      key: 'hash',
      header: 'Transaction',
      mono: true,
      cell: (m) => renderTxHash(chainId, m.txHash),
    },
    { key: 'date', header: 'Date', cell: cellDate },
  ]
}

function detailRegistreVide(reason: string | null | undefined): string {
  if (reason === 'no_events_indexed') {
    return 'Le registre est consulté et vide — pas une panne.'
  }
  return 'Le registre ne renvoie aucun mouvement.'
}

/** Une ligne du fil : l'heure, la phrase, l'acteur, le montant. */
function LigneFil({ mouvement }: Readonly<{ mouvement: MouvementIndexe }>) {
  const acteur = adresseCourte(mouvement.investorAddress)
  return (
    <li className="grid gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[4rem_1fr_auto] sm:items-baseline">
      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {heureLisible(mouvement.occurredAt)}
      </span>
      <span className="min-w-0 text-sm text-zinc-950 dark:text-white">
        {phraseMouvement(mouvement.eventName)}
        {acteur === null ? null : (
          <span className="ml-2 font-mono text-xs text-zinc-500 dark:text-zinc-400">{acteur}</span>
        )}
      </span>
      <span className="text-sm text-zinc-700 tabular-nums dark:text-zinc-300">
        {mouvement.assetAmountAtomic === null ? '—' : montantUsdc(mouvement.assetAmountAtomic)}
      </span>
    </li>
  )
}

/**
 * Le fil chronologique — les mouvements les plus récents, racontés.
 *
 * Il ne double pas la table : celle-ci porte le détail vérifiable (bloc,
 * transaction, adresse), lui porte la lecture — quand, quoi, combien. Un
 * opérateur ouvre la page pour la seconde question, pas pour la première.
 */
function FilChronologique({ mouvements }: Readonly<{ mouvements: readonly MouvementIndexe[] }>) {
  const groupes = grouperParJour(mouvements)
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Que s’est-il passé, et quand ?"
        hint={`Les ${mouvements.length} mouvements les plus récents, du plus récent au plus ancien`}
      />
      <div className="divide-y divide-zinc-950/5 dark:divide-white/5">
        {groupes.map((groupe) => (
          <div key={groupe.jour}>
            <p className="bg-zinc-50/80 px-5 py-2 text-xs font-medium text-zinc-500 first-letter:uppercase dark:bg-zinc-950/40 dark:text-zinc-400">
              {groupe.jour}
            </p>
            <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
              {groupe.mouvements.map((m) => (
                <LigneFil key={m.id} mouvement={m} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Les faits de tête du registre : volume, période couverte, montants cumulés. */
function EnTeteRegistre({
  mouvements,
  cumuls,
}: Readonly<{ mouvements: readonly MouvementIndexe[]; cumuls: readonly CumulType[] }>) {
  const dernier = mouvements[0]?.occurredAt ?? null
  const premier = mouvements[mouvements.length - 1]?.occurredAt ?? null
  const avecMontant = cumuls.filter((c) => c.montantAtomique !== null)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <HeroFigure valeur={formatCount(mouvements.length)} libelle="Mouvements relevés sur la chaîne" />
        <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <SideFact libelle="Types distincts" valeur={formatCount(cumuls.length)} />
          <SideFact libelle="Premier mouvement relevé" valeur={dateLisible(premier)} />
          <SideFact libelle="Dernier mouvement relevé" valeur={ilYA(dernier)} />
          {/* Les cumuls ne sont donnés que par type : additionner un dépôt et
              une facture d'électricité produirait un total qui ne veut rien
              dire. */}
          {avecMontant.map((c) => (
            <SideFact key={c.nom} libelle={`${c.nom} · cumul`} valeur={montantUsdc(c.montantAtomique)} />
          ))}
        </dl>
      </div>
    </Card>
  )
}

function RegistreMouvements({
  reponse,
  mouvements,
  chainId,
}: Readonly<{
  reponse: BackendResult<ReponseEvenements>
  mouvements: readonly MouvementIndexe[] | null
  chainId: number | undefined
}>) {
  if (!reponse.ok) {
    return <AdminErrorState state={reponse.state} />
  }

  if (!mouvements || mouvements.length === 0) {
    return (
      <AdminSourceAttendue
        quoi="Aucun mouvement enregistré"
        detail={detailRegistreVide(reponse.data.events?.reason)}
        requis={['Un premier mouvement relevé sur la chaîne']}
      />
    )
  }

  const recents = trierDuPlusRecent(mouvements)
  const cumuls = agregerParType(recents)
  const fil = recents.slice(0, 6)

  return (
    <>
      <EnTeteRegistre mouvements={recents} cumuls={cumuls} />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <FilChronologique mouvements={fil} />
        </div>

        <AdminSurface className="flex flex-col p-6 lg:col-span-2">
          <AdminSurfaceHeader
            title="Répartition par type"
            description={`${recents.length} mouvements, ${cumuls.length} types distincts`}
          />
          <DistributionBarChart barres={barresDe(cumuls)} />
        </AdminSurface>
      </div>

      <AdminSurface>
        <AdminSurfaceHeader
          className="px-5 pt-5 sm:px-6"
          title="Registre détaillé"
          description="Chaque mouvement avec son bloc, sa transaction et l’adresse concernée — la version vérifiable."
        />
        <AdminTable rows={recents} keyFn={(m) => m.id} columns={colonnesMouvements(chainId)} />
      </AdminSurface>
    </>
  )
}

/* ── Section 03 · Indexation ──────────────────────────────────────────────── */

/** L'état porte un mot autant qu'une couleur : la teinte ne suffit jamais. */
const ETAT_INDEXEUR: Record<string, { readonly mot: string; readonly point: string; readonly texte: string }> = {
  RUNNING: { mot: 'En marche', point: 'bg-success-500', texte: 'text-success-400' },
  IDLE: { mot: 'Au repos', point: 'bg-info-500', texte: 'text-info-400' },
  DEGRADED: { mot: 'Dégradé', point: 'bg-warning-500', texte: 'text-warning-400' },
  STOPPED: { mot: 'À l’arrêt', point: 'bg-danger-500', texte: 'text-danger-400' },
  ERROR: { mot: 'En erreur', point: 'bg-danger-500', texte: 'text-danger-400' },
}

function etatIndexeur(brut: string | null | undefined) {
  if (typeof brut !== 'string' || brut === '') {
    return { mot: 'Non communiqué', point: 'bg-zinc-600', texte: 'text-zinc-400' }
  }
  return ETAT_INDEXEUR[brut.toUpperCase()] ?? { mot: brut, point: 'bg-zinc-600', texte: 'text-zinc-400' }
}

function SectionIndexation({ runtime }: Readonly<{ runtime: BackendResult<Runtime> }>) {
  if (!runtime.ok) {
    return <AdminErrorState state={runtime.state} title="État de l’indexation non lisible" />
  }

  const planificateur = runtime.data.indexerScheduler
  const derniereSynchro = runtime.data.indexer?.lastSyncedAt
  const etat = etatIndexeur(runtime.data.indexerStatus ?? runtime.data.indexer?.status)

  return (
    <AdminSurface className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span aria-hidden="true" className={clsx('size-2 shrink-0 rounded-full', etat.point)} />
        <p className={clsx('text-sm font-medium', etat.texte)}>Indexeur : {etat.mot}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Le registre ci-dessus vaut ce que vaut cette synchronisation.
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetric
          label="Dernière synchronisation"
          value={ilYA(derniereSynchro)}
          hint={dateLisible(derniereSynchro)}
        />
        <AdminMetric label="Dernier bloc indexé" value={nombreDeChaine(planificateur?.lastIndexedBlock)} />
        <AdminMetric label="Cadence de relève" value={cadenceLisible(planificateur?.intervalMs)} />
        {/* Un compteur d'erreurs mesuré à zéro EST une information ; il ne vient
            pas d'une absence retombée sur zéro. */}
        <AdminMetric
          label="Erreurs consécutives"
          value={formatCount(planificateur?.consecutiveErrors)}
          hint={`Base de données : ${runtime.data.db?.reachable === true ? 'joignable' : 'non joignable'}`}
        />
      </div>

      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        {retardLisible(runtime.data.contract?.indexerLagBlocks)}
      </p>
    </AdminSurface>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default async function Page() {
  const [reponse, rebalancing, dashboard, runtime] = await Promise.all([
    callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } }),
    callBackend<RebalancingStatus>('rebalancing-status'),
    callBackend<Dashboard>('dashboard'),
    callBackend<Runtime>('runtime'),
  ])

  // `runtime` n'est pas enveloppé : la chaîne se lit sous `contract`, jamais à
  // la racine. Lue au mauvais endroit, elle vaut `undefined` et aucun lien
  // d'explorateur ne se construit.
  const chainId = runtime.ok ? (runtime.data.contract?.chainId ?? undefined) : undefined
  const mouvements = reponse.ok ? (reponse.data.events?.value ?? null) : null

  const derives = derivesDe(dashboard.ok ? dashboard.data.allocation?.value?.pockets : undefined)
  const etatDerive = etatDeriveDe(dashboard, derives)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Opérations"
        description="Faut-il rééquilibrer, que s’est-il passé sur la chaîne, et le registre est-il à jour."
      />

      <AdminSection
        index="01"
        title="Rééquilibrage"
        description="L’écart à l’allocation cible, poche par poche — et ce que le contrat lui-même n’expose pas."
      >
        <SyntheseDerive dashboard={dashboard} />

        <ChartFrame
          question="Quelle poche s’écarte de sa cible ?"
          unite="en points de pourcentage"
          etat={etatDerive}
          hauteur="h-48"
        >
          <DerivePochesChart poches={derives} />
        </ChartFrame>

        <LectureOnChain rebalancing={rebalancing} />
      </AdminSection>

      <AdminSection
        index="02"
        title="Registre des mouvements"
        description="Les événements indexés de la Series 1 — ce qui s’est réellement produit sur la chaîne."
      >
        <div className="flex items-center gap-2">
          {/* Le backend renvoie ce statut en champ libre : on le valide au lieu
              de le forcer, sinon un libellé « undefined » s'affiche. */}
          {reponse.ok && reponse.data.events ? (
            <AdminStatus status={statutAffichage(reponse.data.events.status)} />
          ) : null}
        </div>
        <RegistreMouvements reponse={reponse} mouvements={mouvements} chainId={chainId} />
      </AdminSection>

      <AdminSection
        index="03"
        title="Fraîcheur du registre"
        description="Un registre ne vaut que par son indexation : voici son état, mesuré à la source."
      >
        <SectionIndexation runtime={runtime} />
      </AdminSection>

      {/* Placée en fin de page, et non en tête : une file vide ouvrant l'écran
          le ferait passer pour mort. Le contenu, lui, ne bouge pas — la source
          n'existe toujours pas, et c'est ce qui doit être dit. */}
      <AdminSection
        index="04"
        title="En attente de validation"
        description="Approbations financières — source en attente"
      >
        <AdminSourceAttendue
          quoi="Aucune file de validation ouverte"
          detail="DistributionApproval, VaultDeploymentApproval et ProposalSignature existent en base mais ne sont pas encore exposées en HTTP."
          requis={[
            'Lecture des demandes en attente et signatures reçues',
            'Geste d’approbation/rejet avec journalisation',
            'Contrôle conformité rattaché à chaque demande',
          ]}
        />
      </AdminSection>
    </div>
  )
}
