import { AdminPageHeader, AdminSectionHeading } from '@/components/admin/page-header'
import { AdminReading } from '@/components/admin/reading'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from '@/components/catalyst/description-list'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { requireSession } from '@/lib/auth'
import { callBackend } from '@/lib/backend/client'
import { availabilityFromResolu } from '@/lib/backend/availability'
import { formatNumber } from '@/lib/format'
import { etatSourceLisible, motifLisible } from '@/lib/mouvements'
import { editorial, measuredCount, unavailable, type Availability } from '@/lib/vaults/model'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Backtests' }
export const dynamic = 'force-dynamic'

/**
 * Backtests — Catalyst pur.
 * Source : backtest-historical uniquement — aucune courbe inventée.
 */

type Resolved<T> = { readonly status: string; readonly value: T | null; readonly reason?: string | null }
type Run = { readonly id?: string; readonly label?: string | null }
type BacktestResponse = { readonly runs?: Resolved<readonly Run[]> }

function detailBacktestVide(reason: string | undefined): string {
  if (reason === undefined) {
    return 'Le service a répondu, et son registre ne contient aucune exécution. Rien n’est tracé tant qu’un premier backtest n’existe pas : une performance historique inventée se lirait comme une promesse de rendement.'
  }
  return `Le service a répondu, et aucune exécution n’est disponible : ${reason}. Rien n’est tracé entre-temps — une performance historique inventée se lirait comme une promesse de rendement.`
}

function labelRun(run: Run): string {
  if (run.label === null || run.label === undefined || run.label === '') return 'Exécution sans libellé'
  return run.label
}

export default async function Page() {
  await requireSession()
  const response = await callBackend<BacktestResponse>('backtest-historical')
  const block = response.ok ? response.data.runs : undefined
  const runs = block?.value
  const reason = motifLisible(block?.reason)

  const runCountCell = measuredCount(
    availabilityFromResolu<readonly Run[]>(block, '/api/v1/backtest/historical'),
  )

  const none = runs === null || runs === undefined || runs.length === 0

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Backtests"
        description="Ce que la stratégie aurait produit dans le passé — uniquement si le service a conservé une exécution. Aucune courbe n’est dessinée sans série réelle."
      />

      <DescriptionList>
        <DescriptionTerm>Exécutions</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={runCountCell} />
        </DescriptionDetails>
        <DescriptionTerm>État de la source</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(response.ok ? 'Joignable' : 'Indisponible')} />
        </DescriptionDetails>
        <DescriptionTerm>Registre</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading
            value={editorial(block?.status === undefined ? 'Non renseigné' : etatSourceLisible(block.status))}
          />
        </DescriptionDetails>
        <DescriptionTerm>Courbe historique</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(none ? 'Non disponible' : 'Disponible')} />
        </DescriptionDetails>
        <DescriptionTerm>Raison</DescriptionTerm>
        <DescriptionDetails>
          <AdminReading value={editorial(reason ?? 'Aucune')} />
        </DescriptionDetails>
      </DescriptionList>

      {!response.ok ? (
        <Text>
          Les backtests n’ont pas pu être lus. Le service n’a pas répondu à la requête — ce silence n’est pas
          interprété comme la preuve qu’aucun backtest n’existe.
        </Text>
      ) : none ? (
        <>
          <Text>
            Aucun backtest n’a été exécuté à ce jour. {detailBacktestVide(reason)}
          </Text>
          {block === undefined ? null : (
            <Text className="text-sm text-zinc-500">
              État du registre renvoyé par le service :{' '}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{block.status}</span>
            </Text>
          )}
          <AdminSectionHeading title="Prérequis" description="Avant qu’une courbe puisse être tracée." />
          <ul className="list-disc space-y-1 pl-5 text-sm/6 text-zinc-500">
            <li>Une période de référence, avec une date de début et de fin</li>
            <li>L’historique de prix des actifs du portefeuille sur cette période</li>
            <li>Une exécution du calcul par le service, conservée avec son horodatage</li>
          </ul>
        </>
      ) : (
        <>
          <AdminSectionHeading
            title="Exécutions enregistrées"
            description={`${formatNumber(runs.length)} exécution${runs.length > 1 ? 's' : ''} conservée${runs.length > 1 ? 's' : ''} — liste uniquement, sans courbe projetée.`}
          />
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Libellé</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.map((run, rank) => (
                <TableRow key={run.id ?? String(rank)}>
                  <TableCell className="font-medium">{labelRun(run)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
