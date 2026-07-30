import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { TrendPoint } from '@/lib/vaults/overview'
import { Subheading } from '@/components/catalyst/heading'
import { Text, Strong } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import { Absent, gcc, Panel } from './primitives'

/**
 * L'activité récente — en TABLE, plus en graphique.
 *
 * ── Pourquoi le tracé a disparu ───────────────────────────────────────────
 * Ce panneau portait le plot du prototype : neuf courbes bézier décoratives, un
 * halo blanc, deux voiles de brume, deux règles à ordonnée fixe, et par-dessus
 * une courbe calculée sur la vraie série. Tout l'ornement a été retiré sur
 * demande, puis le tracé lui-même.
 *
 * Reste ce que le tracé disait vraiment : trois points datés et leur valeur. Une
 * `Table` de Catalyst les énonce sans interprétation — pas d'échelle implicite,
 * pas de courbe qui suggère une tendance entre deux mesures, pas d'axe sans
 * graduation. Ce qui est lu est exactement ce que le service a renvoyé.
 *
 * Quand il n'y a pas de série, la table ne s'affiche pas : l'absence est nommée
 * avec la route qui l'aurait fournie.
 */
export function GreenHeroChartPanel({
  title,
  trend,
  axisLabel,
  countLabel,
}: Readonly<{
  title: string
  trend: Availability<readonly TrendPoint[]>
  /** Ce que la série mesure — valeur déplacée, ou mouvements par jour. */
  axisLabel: string
  countLabel: Availability<string>
}>) {
  return (
    <Panel className={gcc.heroChart} aria-labelledby="gcc-hero-title" data-gcc="hero-chart">
      <div className={gcc.heroHead}>
        <Subheading level={2} id="gcc-hero-title" className={gcc.cardTitle}>
          {title}
        </Subheading>
        {isAvailable(countLabel) ? (
          <Text className={gcc.cellText}>
            {countLabel.value} movements · {axisLabel}
          </Text>
        ) : (
          <Absent availability={countLabel} showRoute={false} />
        )}
      </div>

      <div className={gcc.heroBody}>
        {isAvailable(trend) ? (
          <Table dense grid className={gcc.heroTable}>
            <TableHead>
              <TableRow>
                <TableHeader>Day</TableHeader>
                <TableHeader>{axisLabel}</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {trend.value.map((point) => (
                <TableRow key={`${point.label}-${point.value}`}>
                  <TableCell>{point.label}</TableCell>
                  <TableCell className={gcc.cellStrong}>{point.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Absent availability={trend} />
        )}
      </div>
    </Panel>
  )
}
