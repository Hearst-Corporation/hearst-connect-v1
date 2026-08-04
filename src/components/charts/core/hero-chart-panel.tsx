'use client'

import { isAvailable, type Availability } from '@/lib/vaults/model'
import { Panel } from '@/components/compositions'
import type { TrendPoint } from '@/lib/vaults/overview'
import { Subheading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/catalyst/table'
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Absent, gcc } from '@/components/layout/console'
type TrendTooltipPoint = Readonly<{ label: string; value: number; detail: string }>

function TrendTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: TrendTooltipPoint }[] }>) {
  const rawPoint = payload?.[0]?.payload
  const point =
    typeof rawPoint === 'object' && rawPoint !== null
      ? (rawPoint as TrendTooltipPoint)
      : null

  if (active !== true || point === null) return null

  return (
    <div className={gcc.heroTooltip}>
      <p className={gcc.heroTooltipTitle}>{point.detail}</p>
      <p className={gcc.heroTooltipLine}>{point.value} movements</p>
    </div>
  )
}

export function GreenHeroChartPanel({
  title,
  trend,
  countLabel,
}: Readonly<{
  title: string
  trend: Availability<readonly TrendPoint[]>
  countLabel: Availability<string>
}>) {
  return (
    <Panel tone="plain" className={gcc.heroChart} aria-labelledby="gcc-hero-title" data-gcc="hero-chart">
      <div className={gcc.heroHead}>
        <Subheading level={2} id="gcc-hero-title" className={gcc.cardTitle}>
          {title}
        </Subheading>
        {isAvailable(countLabel) ? (
          <Text className={gcc.cellText}>{countLabel.value}</Text>
        ) : (
          <Absent availability={countLabel} showRoute={false} />
        )}
      </div>

      <div className={gcc.heroBody}>
        {isAvailable(trend) ? (
          <>
            {trend.value.length === 0 ? (
              <Text className={gcc.cellText}>Aucun point d’activité ordonné n’est disponible actuellement.</Text>
            ) : (
              <div className={gcc.heroChartBody} role="img" aria-label={`${title} line chart`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trend.value}
                    margin={{ top: 30, right: 56, bottom: 34, left: 34 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255, 255, 255, 0.12)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#9a9da6', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      minTickGap={24}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#9a9da6', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={26}
                    />
                    <Tooltip
                      cursor={{ stroke: 'rgba(255, 255, 255, 0.25)' }}
                      content={<TrendTooltip />}
                    />
                    <Line
                      type="linear"
                      dataKey="value"
                      stroke="var(--gcc-green)"
                      strokeWidth={2}
                      dot={{
                        r: 5,
                        fill: 'var(--gcc-green)',
                        stroke: '#0f1113',
                        strokeWidth: 1,
                      }}
                      activeDot={{
                        r: 6,
                        fill: 'var(--gcc-green)',
                        stroke: '#0f1113',
                        strokeWidth: 1,
                      }}
                      isAnimationActive={false}
                    >
                      <LabelList
                        dataKey="value"
                        position="top"
                        offset={10}
                        className={gcc.heroPointLabel}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <Table dense grid className={gcc.heroTableSr}>
              <caption className={gcc.srOnly}>{title} data table fallback</caption>
              <TableHead>
                <TableRow>
                  <TableHeader>Jour</TableHeader>
                  <TableHeader>Mouvements</TableHeader>
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
          </>
        ) : (
          <Absent availability={trend} showRoute={false} />
        )}
      </div>
    </Panel>
  )
}
