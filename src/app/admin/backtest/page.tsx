import { ChartFrame } from '@/components/admin/chart-frame'
import { Card, CardHeader, SourceAttendue } from '@/components/admin/cockpit'
import { PageHeader } from '@/components/admin/page-header'
import { AdminSection } from '@/components/admin/surfaces'
import { callBackend } from '@/lib/backend/client'
import { motifLisible } from '@/lib/mouvements'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Rétro-tests' }
export const dynamic = 'force-dynamic'

/**
 * Rétro-tests — ce que la stratégie aurait produit sur le passé.
 *
 * Aucun rétro-test n'a encore été exécuté : le service le dit, et la page s'en
 * tient là. C'est la page où la tentation de tricher est la plus forte — une
 * courbe de performance historique se fabrique en trois lignes et se regarde
 * volontiers. Elle serait une invention pure, et une invention qui ressemble à
 * une promesse de rendement.
 *
 * On laisse donc le cadre du graphique visible et vide, avec la phrase qui dit
 * ce qu'on attend. Le jour où le service renvoie une série, elle prend la place
 * de la phrase sans que rien d'autre ne bouge.
 */

type Resolu<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type Execution = { readonly id?: string; readonly label?: string | null }
type ReponseRetroTests = { readonly runs?: Resolu<readonly Execution[]> }

export default async function Page() {
  const reponse = await callBackend<ReponseRetroTests>('backtest-historical')
  const bloc = reponse.ok ? reponse.data.runs : undefined
  const executions = bloc?.value
  const motif = motifLisible(bloc?.reason)

  const aucune = executions === null || executions === undefined || executions.length === 0

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rétro-tests"
        description="Ce que la stratégie du fonds aurait produit sur des périodes passées. Tout est calculé par le service : rien n’est projeté, extrapolé ni lissé ici."
      />

      <AdminSection>

      {!reponse.ok ? (
        <SourceAttendue
          quoi="Les rétro-tests n’ont pas pu être lus"
          detail="Le service n’a pas répondu à la demande. On ne conclut pas de ce silence qu’aucun rétro-test n’existe."
          requis={['Une réponse du service']}
        />
      ) : (
        <>
          <ChartFrame
            question="Qu’aurait produit la stratégie sur le passé ?"
            unite="en valeur de part, par période"
            etat={{
              type: 'attendue',
              explication:
                motif === undefined
                  ? 'Aucun rétro-test n’a encore été exécuté. Tant qu’il n’y en a pas, aucune courbe n’est tracée : une performance historique inventée se lirait comme une promesse de rendement.'
                  : `Aucune courbe n’est tracée : ${motif}. Une performance historique inventée se lirait comme une promesse de rendement.`,
            }}
            hauteur="h-64"
          />

          {aucune ? (
            <SourceAttendue
              quoi="Aucun rétro-test exécuté à ce jour"
              detail="Cette page est prête : dès qu’un premier rétro-test sera lancé, ses résultats s’afficheront ici sans autre intervention. En attendant, elle n’avance aucun chiffre."
              requis={[
                'Une période de référence choisie, avec sa date de début et de fin',
                'L’historique de prix des actifs du portefeuille sur cette période',
                'Une exécution du calcul par le service, conservée avec son horodatage',
              ]}
            />
          ) : (
            <Card>
              <CardHeader
                title="Quels rétro-tests ont été exécutés ?"
                hint={`${executions.length} exécution${executions.length > 1 ? 's' : ''} conservée${executions.length > 1 ? 's' : ''}`}
              />
              <ul className="divide-y divide-zinc-950/5 dark:divide-white/5">
                {executions.map((execution, rang) => (
                  <li key={execution.id ?? String(rang)} className="px-5 py-3.5 text-sm text-zinc-950 dark:text-white">
                    {execution.label === null || execution.label === undefined || execution.label === ''
                      ? 'Exécution sans intitulé'
                      : execution.label}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {/* Le sous-sol : la réponse détaillée pour qui veut vérifier un champ. */}
      </AdminSection>
    </div>
  )
}
