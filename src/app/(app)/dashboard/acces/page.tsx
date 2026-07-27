import { Badge } from '@/components/catalyst/badge'
import { Heading } from '@/components/catalyst/heading'
import { Input, InputGroup } from '@/components/catalyst/input'
import { Select } from '@/components/catalyst/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/catalyst/table'
import { Text } from '@/components/catalyst/text'
import { DemoNotice } from '@/components/demo-notice'
import { accessEvents } from '@/lib/demo-data'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'
import type { Metadata } from 'next'
import { statusColor } from '../status'

export const metadata: Metadata = {
  title: 'Journal d’accès',
}

export default function AccessLogPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <Heading>Journal d’accès</Heading>
          <Text className="mt-2">Chaque tentative d’accès, autorisée ou non, sur l’ensemble de vos espaces.</Text>
        </div>
        <div className="flex gap-4">
          <InputGroup>
            <MagnifyingGlassIcon />
            <Input name="search" placeholder="Rechercher…" aria-label="Rechercher dans le journal" />
          </InputGroup>
          <Select name="period" aria-label="Période" defaultValue="7">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <DemoNotice>
          Données de démonstration — le filtre et la période ne sont pas encore branchés sur une source réelle.
        </DemoNotice>
      </div>

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
          {accessEvents.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="font-medium">{event.actor}</div>
                <div className="text-zinc-500">{event.actorEmail}</div>
              </TableCell>
              <TableCell>{event.workspace}</TableCell>
              <TableCell>{event.action}</TableCell>
              <TableCell className="text-zinc-500">{event.channel}</TableCell>
              <TableCell>
                <Badge color={statusColor[event.status]}>{event.status}</Badge>
              </TableCell>
              <TableCell className="text-right text-zinc-500">{event.at}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
