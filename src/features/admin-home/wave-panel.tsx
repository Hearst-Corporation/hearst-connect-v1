import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { BarPoint } from '@/lib/vaults/overview'
import { Subheading } from '@/components/catalyst/heading'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Absent, gcc, Panel } from '@/components/layout/console'

/**
 * Les types de mouvement — en TABLE, plus en vague.
 *
 * ── Pourquoi la vague a disparu ───────────────────────────────────────────
 * Ce panneau dessinait la cloche du prototype : un halo blanc de 28px, une aire
 * verte et un dégradé vertical. Pour la faire ressembler à la référence, la
 * série était même RÉORDONNÉE autour du centre — le plus gros type au sommet,
 * les autres en alternance. La forme prenait le pas sur la lecture.
 *
 * Une table dit la même chose sans réarranger quoi que ce soit : chaque type,
 * son compte, dans l'ordre décroissant que `movementTypeBars` produit. Rien
 * n'est interprété, rien n'est déplacé pour l'esthétique.
 */
export function GreenWavePanel({
  title,
  bars,
  availability,
}: Readonly<{ title: string; bars: readonly BarPoint[]; availability: Availability<unknown> }>) {
  return (
    <Panel className={gcc.wavePanel} aria-label={title} data-gcc="wave-panel">
      <div className={gcc.heroHead}>
        <Subheading level={3} className={gcc.cardTitle}>
          {title}
        </Subheading>
      </div>

      <div className={gcc.heroBody}>
        {isAvailable(availability) ? (
          <Table dense grid className={gcc.heroTable}>
            <TableHead>
              <TableRow>
                <TableHeader>Type</TableHeader>
                <TableHeader>Nombre</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {bars.map((bar) => (
                <TableRow key={bar.label}>
                  <TableCell>{bar.label}</TableCell>
                  <TableCell className={gcc.cellStrong}>{bar.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Absent availability={availability} showRoute={false} />
        )}
      </div>
    </Panel>
  )
}
