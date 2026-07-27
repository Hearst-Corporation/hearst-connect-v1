import { Avatar } from '@/components/catalyst/avatar'
import { Badge } from '@/components/catalyst/badge'
import { Button } from '@/components/catalyst/button'
import { Heading } from '@/components/catalyst/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DemoNotice } from '@/components/demo-notice'
import { members } from '@/lib/demo-data'
import type { Metadata } from 'next'
import { memberStatusColor } from '../status'

export const metadata: Metadata = {
  title: 'Membres',
}

export default function MembersPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <Heading>Membres</Heading>
          <Text className="mt-2">Les personnes ayant accès à au moins un espace de votre organisation.</Text>
        </div>
        <Button href="mailto:connect@hearstcorporation.io?subject=Invitation%20Hearst%20Connect">
          Inviter un membre
        </Button>
      </div>

      <div className="mt-6">
        <DemoNotice />
      </div>

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
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-4">
                  <Avatar initials={member.initials} className="size-8 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" />
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-zinc-500">{member.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-zinc-500">{member.team}</TableCell>
              <TableCell>{member.role}</TableCell>
              <TableCell className="text-right">
                <Badge color={memberStatusColor[member.status]}>{member.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
