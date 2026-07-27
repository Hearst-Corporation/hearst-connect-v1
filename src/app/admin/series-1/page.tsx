import { Card, CardHeader, HeroFigure, SideFact, SourceAttendue } from '@/components/admin/cockpit'
import { EndpointSection } from '@/components/admin/endpoint-section'
import { PageHeader } from '@/components/admin/page-header'
import { callBackend } from '@/lib/backend/client'
import {
  adresseCourte,
  dateLisible,
  ilYA,
  libelleMouvement,
  montantUsdc,
  motifLisible,
  phraseMouvement,
} from '@/lib/mouvements'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Série 1' }
export const dynamic = 'force-dynamic'

/**
 * Série 1 — le journal du fonds, lu comme un récit.
 *
 * C'est la seule page du produit dont la source est pleinement alimentée : la
 * chaîne y dépose chaque mouvement, et le service les restitue tels quels. On
 * ne les résume donc pas en compteurs — on les raconte, du plus récent au plus
 * ancien, une phrase par mouvement.
 *
 * Deux lectures cohabitent : le fil chronologique, qui répond à « que s'est-il
 * passé », et la répartition par nature, qui répond à « de quoi ce journal est
 * fait ». Aucun total n'est calculé ici : additionner un dépôt et un relevé de
 * minage produirait un chiffre qui ne veut rien dire.
 */

type Mouvement = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber?: string | null
  readonly txHash?: string | null
  readonly investorAddress?: string | null
  readonly assetAmountAtomic?: string | null
  readonly shareAmountAtomic?: string | null
  readonly occurredAt?: string | null
}

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type ReponseEvenements = { readonly events?: Resolu<readonly Mouvement[]> }

/** Un mouvement porte-t-il un montant financier ? Un relevé technique, non. */
const estFinancier = (m: Mouvement): boolean =>
  m.assetAmountAtomic !== null && m.assetAmountAtomic !== undefined && m.assetAmountAtomic !== ''

function JournalVide({ motif }: Readonly<{ motif: string | undefined }>) {
  const suffixe =
    motif === undefined
      ? 'la chaîne n’a encore rien déposé pour ce fonds. Ce n’est pas une panne.'
      : `${motif}. Ce n’est pas une panne.`
  return (
    <SourceAttendue
      quoi="Aucun mouvement enregistré à ce jour"
      detail={`Le journal est consulté et il est vide : ${suffixe}`}
      requis={['Un premier mouvement enregistré sur la chaîne']}
    />
  )
}

function CorpsJournal({
  reponseOk,
  mouvements,
  motif,
}: Readonly<{ reponseOk: boolean; mouvements: readonly Mouvement[] | null | undefined; motif: string | undefined }>) {
  if (!reponseOk) {
    return (
      <SourceAttendue
        quoi="Le journal des mouvements n’a pas pu être lu"
        detail="Le service n’a pas répondu à la demande. Aucun mouvement n’est supposé : une liste vide se lirait à tort comme « il ne s’est rien passé »."
        requis={['Une réponse du service']}
      />
    )
  }
  if (mouvements === null || mouvements === undefined || mouvements.length === 0) {
    return <JournalVide motif={motif} />
  }
  return <JournalSerie1 mouvements={mouvements} />
}

export default async function Page() {
  const reponse = await callBackend<ReponseEvenements>('series1-events', { params: { limit: 100 } })
  const bloc = reponse.ok ? reponse.data.events : undefined
  const mouvements = bloc?.value

  return (
    <div className="space-y-6">
      <PageHeader
        title="Série 1"
        description="Tout ce que la chaîne a enregistré pour ce fonds, du plus récent au plus ancien. Chaque ligne vient du service ; rien n’est agrégé ni estimé ici."
        endpointIds={['series1-events']}
      />

      <CorpsJournal reponseOk={reponse.ok} mouvements={mouvements} motif={motifLisible(bloc?.reason)} />

      {/* Le sous-sol : la réponse détaillée reste consultable pour qui veut
          vérifier un champ, jamais imposée à qui vient lire le journal. */}
      <EndpointSection endpointId="series1-events" title="Réponse détaillée du service" />
    </div>
  )
}

function JournalSerie1({ mouvements }: Readonly<{ mouvements: readonly Mouvement[] }>) {
  // Répartition par nature. Une barre horizontale se lit dès le premier
  // élément, contrairement à une part de camembert sur six catégories.
  const parNature = new Map<string, number>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const vu = parNature.get(nom)
    parNature.set(nom, vu === undefined ? 1 : vu + 1)
  }
  const repartition = [...parNature.entries()].sort((a, b) => b[1] - a[1])
  const maximum = repartition[0][1]

  const financiers = mouvements.filter(estFinancier)
  const dernier = mouvements[0]

  return (
    <>
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <HeroFigure valeur={mouvements.length.toLocaleString('fr-FR')} libelle="Mouvements enregistrés" />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <SideFact libelle="Natures distinctes" valeur={String(repartition.length)} />
            <SideFact
              libelle="Portant un montant"
              valeur={financiers.length === 0 ? 'aucun' : String(financiers.length)}
            />
            <SideFact libelle="Dernier mouvement" valeur={ilYA(dernier.occurredAt)} />
          </dl>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="De quoi ce journal est-il fait ?"
            hint={`${mouvements.length} mouvement${mouvements.length > 1 ? 's' : ''} répartis en ${repartition.length} nature${repartition.length > 1 ? 's' : ''}`}
          />
          <ul className="space-y-3 px-5 py-4">
            {repartition.map(([nom, nombre]) => (
              <li key={nom}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-xs text-zinc-300">{nom}</span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums">{nombre}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                  <div
                    className="h-full rounded-full bg-accent-400"
                    style={{ width: `${Math.round((nombre / maximum) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Que s’est-il passé ?" hint="Du plus récent au plus ancien" />
          <ol className="divide-y divide-white/[0.07]">
            {mouvements.map((m) => (
              <LigneMouvement key={m.id} mouvement={m} />
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}

/**
 * Une ligne = une phrase. Le montant, l'investisseur et le numéro de bloc ne
 * s'affichent que si la chaîne les a fournis : un champ absent disparaît, il ne
 * laisse pas un tiret orphelin dans un récit.
 */
function LigneMouvement({ mouvement }: Readonly<{ mouvement: Mouvement }>) {
  const investisseur = adresseCourte(mouvement.investorAddress)
  const bloc = mouvement.blockNumber

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm text-white">{phraseMouvement(mouvement.eventName)}</span>
        {estFinancier(mouvement) ? (
          <span className="text-sm font-semibold text-accent-300 tabular-nums">
            {montantUsdc(mouvement.assetAmountAtomic)}
          </span>
        ) : null}
        <span className="ml-auto shrink-0 text-xs text-zinc-500" title={dateLisible(mouvement.occurredAt)}>
          {ilYA(mouvement.occurredAt)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs text-zinc-500">
        {investisseur !== null ? (
          <span>
            investisseur <span className="font-mono text-zinc-400">{investisseur}</span>
          </span>
        ) : null}
        {bloc === null || bloc === undefined || bloc === '' ? null : (
          <span className="tabular-nums">bloc {Number(bloc).toLocaleString('fr-FR')}</span>
        )}
        <span>{dateLisible(mouvement.occurredAt)}</span>
      </div>
    </li>
  )
}
