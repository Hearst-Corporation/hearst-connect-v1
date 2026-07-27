import { Heading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DataState, RetryButton, StatusBadge } from '@/components/data-state'
import { fetchAccessEvents } from '@/lib/data-sources'
import { hasDisplayableValue } from '@/lib/resolved'
import { retryPath } from '@/lib/revalidate'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Journal d’accès',
}

async function retry() {
  'use server'
  await retryPath('/dashboard/acces')
}

export default async function AccessLogPage() {
  const events = await fetchAccessEvents()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <div className="flex items-center gap-3">
            <Heading>Journal d’accès</Heading>
            <StatusBadge state={events} />
          </div>
          <Text className="mt-2">Chaque tentative d’accès, autorisée ou non, sur l’ensemble de vos espaces.</Text>
        </div>
      </div>

      {/*
        Aucun filtre ni sélecteur de période n'est rendu tant que la source n'est
        pas branchée : un contrôle qui ne filtre rien laisserait croire que le
        tableau vide est un résultat de recherche.
      */}
      {hasDisplayableValue(events) ? (
        events.value.length === 0 ? (
          <div className="mt-8">
            <DataState state={{ ...events, status: 'EMPTY', value: null }} />
          </div>
        ) : (
          <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            <TableHead>
              <TableRow>
                <TableHeader>Auteur</TableHeader>
                <TableHeader>Espace</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Canal</TableHeader>
                <TableHeader>Statut</TableHeader>
                <TableHeader className="text-right">Horodatage</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.value.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="font-medium">{event.actor}</div>
                    <div className="text-zinc-500">{event.actorEmail}</div>
                  </TableCell>
                  <TableCell>{event.workspace}</TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell className="text-zinc-500">{event.channel}</TableCell>
                  <TableCell>{event.status}</TableCell>
                  <TableCell className="text-right text-zinc-500">{event.at}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="mt-8">
          <DataState state={events} retryAction={<RetryButton action={retry}>Réessayer</RetryButton>} />
        </div>
      )}
    </>
  )
}
