import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { StatusBadge, UnavailableState } from '@/components/admin/truthful'
import { callBackend } from '@/lib/backend/client'
import { adresseCourte, dateLisible, libelleMouvement, montantUsdc } from '@/lib/mouvements'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Opérations' }
export const dynamic = 'force-dynamic'

/**
 * Opérations — deux registres sur un seul écran.
 *
 * En haut, ce qui attend une décision. En bas, ce qui s'est déjà passé.
 * L'ordre n'est pas décoratif : on ouvre cette page pour agir, pas pour lire
 * un historique.
 *
 * Le bloc de validation n'a pas encore de source : les tables d'approbation
 * existent en base (DistributionApproval, VaultDeploymentApproval,
 * ProposalSignature) mais aucune route ne les expose. Il l'annonce au lieu de
 * simuler une file vide, qu'on prendrait pour « rien à valider ».
 */

type MouvementIndexe = {
  readonly id: string
  readonly eventName: string
  readonly blockNumber: string
  readonly txHash: string
  readonly investorAddress: string | null
  readonly assetAmountAtomic: string | null
  readonly occurredAt: string | null
}

type ReponseEvenements = {
  readonly events?: {
    readonly status: string
    readonly value: readonly MouvementIndexe[] | null
    readonly reason?: string | null
  }
}

export default async function Page() {
  const reponse = await callBackend<ReponseEvenements>('series1-events', { params: { limit: 50 } })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Opérations"
        description="Ce qui attend une décision, puis ce qui s’est passé. Toute valeur provient du service ; rien n’est calculé ici."
        endpointIds={['series1-events', 'rebalancing-status']}
      />

      {/* ── A. En attente de décision ───────────────────────────────────── */}
      <section aria-labelledby="attente-decision" className="space-y-3">
        <h2 id="attente-decision" className="text-sm font-semibold text-white">
          En attente de votre validation
        </h2>
        <SourceAttendue
          quoi="Aucune file de validation n’est encore ouverte"
          detail="Les demandes d’approbation financière ne sont pas encore transmises par le service. Tant qu’elles ne le sont pas, cet écran n’affiche rien plutôt qu’une file vide, qu’on lirait à tort comme « rien à valider »."
          requis={[
            'Une lecture des demandes en attente et de leurs signatures déjà reçues',
            'Le geste d’approbation et de rejet, avec écriture au journal',
            'Le contrôle de conformité rattaché à chaque demande',
          ]}
        />
      </section>

      {/* ── B. Registre des mouvements ──────────────────────────────────── */}
      <section aria-labelledby="registre" className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 id="registre" className="text-sm font-semibold text-white">
            Registre des mouvements
          </h2>
          {reponse.ok && reponse.data.events ? <StatusBadge status={reponse.data.events.status as never} /> : null}
        </div>

        {!reponse.ok ? (
          <UnavailableState state={reponse.state} />
        ) : (
          <RegistreMouvements bloc={reponse.data.events} />
        )}
      </section>
    </div>
  )
}

function RegistreMouvements({ bloc }: Readonly<{ bloc: ReponseEvenements['events'] }>) {
  const mouvements = bloc?.value

  if (!bloc || mouvements === null || mouvements === undefined || mouvements.length === 0) {
    return (
      <SourceAttendue
        quoi="Aucun mouvement enregistré à ce jour"
        detail={
          bloc?.reason === 'no_events_indexed'
            ? 'Le registre est consulté et il est vide : aucun mouvement n’a encore été relevé sur la chaîne. Ce n’est pas une panne.'
            : 'Le registre ne renvoie aucun mouvement pour le moment.'
        }
        requis={['Un premier mouvement relevé sur la chaîne']}
      />
    )
  }

  const parType = new Map<string, number>()
  for (const m of mouvements) {
    const nom = libelleMouvement(m.eventName)
    const dejaVu = parType.get(nom)
    parType.set(nom, dejaVu === undefined ? 1 : dejaVu + 1)
  }
  const repartition = [...parType.entries()].sort((a, b) => b[1] - a[1])
  const maximum = repartition[0][1]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Répartition — barres horizontales : lisibles dès le premier élément,
          contrairement à une part de camembert. */}
      <Card className="lg:col-span-1">
        <CardHeader title="Quels mouvements composent le registre ?" hint={`${mouvements.length} au total`} />
        <ul className="space-y-3 px-5 py-4">
          {repartition.map(([nom, nombre]) => (
            <li key={nom}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-xs text-zinc-300">{nom}</span>
                <span className="shrink-0 text-xs text-zinc-400 tabular-nums">{nombre}</span>
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

      {/* Registre chronologique */}
      <Card className="lg:col-span-2">
        <CardHeader title="Que s’est-il passé ?" hint="Du plus récent au plus ancien" />
        <ul className="divide-y divide-white/[0.07]">
          {mouvements.map((m) => (
            <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5">
              <span className="text-sm text-white">{libelleMouvement(m.eventName)}</span>
              {m.assetAmountAtomic !== null ? (
                <span className="text-sm font-semibold text-accent-300 tabular-nums">
                  {montantUsdc(m.assetAmountAtomic)}
                </span>
              ) : null}
              {adresseCourte(m.investorAddress) !== null ? (
                <span className="font-mono text-xs text-zinc-400">{adresseCourte(m.investorAddress)}</span>
              ) : null}
              <span className="ml-auto text-xs text-zinc-400">{dateLisible(m.occurredAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
