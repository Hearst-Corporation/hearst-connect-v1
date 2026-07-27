import { Avatar } from '@/components/catalyst/avatar'
import { Heading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DataState, RetryButton, StatusBadge } from '@/components/data-state'
import { fetchMembers } from '@/lib/data-sources'
import { hasDisplayableValue } from '@/lib/resolved'
import { retryPath } from '@/lib/revalidate'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Membres',
}

async function retry() {
  'use server'
  await retryPath('/dashboard/membres')
}

export default async function MembersPage() {
  const members = await fetchMembers()

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <div className="flex items-center gap-3">
            <Heading>Membres</Heading>
            <StatusBadge state={members} />
          </div>
          <Text className="mt-2">Les personnes ayant accès à au moins un espace de votre organisation.</Text>
        </div>
      </div>

      {hasDisplayableValue(members) ? (
        members.value.length === 0 ? (
          <div className="mt-8">
            <DataState state={{ ...members, status: 'EMPTY', value: null }} />
          </div>
        ) : (
          <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
            <TableHead>
              <TableRow>
                <TableHeader>Membre</TableHeader>
                <TableHeader>Équipe</TableHeader>
                <TableHeader>Rôle</TableHeader>
                <TableHeader className="text-right">Statut</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.value.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-4">
                      <Avatar
                        initials={member.name.slice(0, 2).toUpperCase()}
                        className="size-8 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                      />
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-zinc-500">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  {/* Une équipe non renseignée reste « — », jamais un libellé inventé. */}
                  <TableCell className="text-zinc-500">{member.team ?? '—'}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell className="text-right">{member.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      ) : (
        <div className="mt-8">
          <DataState state={members} retryAction={<RetryButton action={retry}>Réessayer</RetryButton>} />
        </div>
      )}
    </>
  )
}
