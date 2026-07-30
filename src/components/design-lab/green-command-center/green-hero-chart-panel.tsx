import { isAvailable, type Availability } from '@/lib/vaults/model'
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
import { Absent, gcc, Panel } from './primitives'

const CHART_WIDTH = 760
const CHART_HEIGHT = 320
const CHART_PADDING = { top: 36, right: 66, bottom: 58, left: 66 } as const

const SVG_NUMBER_FONT = 'Arial, Helvetica, sans-serif'

type ChartPoint = Readonly<{ x: number; y: number; label: string; value: number }>

function buildChartPoints(points: readonly TrendPoint[]): readonly ChartPoint[] {
  if (points.length === 0) return []

  const innerWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
  const maxValue = Math.max(...points.map((point) => point.value), 1)
  const minValue = 0
  const span = Math.max(maxValue - minValue, 1)

  return points.map((point, index) => {
    const x =
      points.length === 1
        ? CHART_PADDING.left + innerWidth / 2
        : CHART_PADDING.left + (innerWidth * index) / (points.length - 1)
    const y =
      CHART_PADDING.top +
      innerHeight -
      ((Math.max(point.value, minValue) - minValue) / span) * innerHeight
    return { x, y, label: point.label, value: point.value }
  })
}

function buildYTicks(maxValue: number) {
  return [0, 1, 2, 3, 4].map((step) => {
    const ratio = step / 4
    const value = Math.round(maxValue - ratio * maxValue)
    const y = CHART_PADDING.top + (CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom) * ratio
    return { value, y }
  })
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
    <Panel className={gcc.heroChart} aria-labelledby="gcc-hero-title" data-gcc="hero-chart">
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
              <Text className={gcc.cellText}>No ordered activity points are currently available.</Text>
            ) : (
              (() => {
                const chartPoints = buildChartPoints(trend.value)
                const polyline = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
                const maxValue = Math.max(...trend.value.map((point) => point.value), 1)
                const yTicks = buildYTicks(maxValue)

                return (
                  <div className={gcc.heroChartBody} role="img" aria-label={`${title} line chart`}>
                    <svg
                      className={gcc.heroChartSvg}
                      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                      aria-hidden="true"
                    >
                      {yTicks.map((tick) => (
                        <g key={`y-${tick.value}-${tick.y}`}>
                          <line
                            x1={CHART_PADDING.left}
                            x2={CHART_WIDTH - CHART_PADDING.right}
                            y1={tick.y}
                            y2={tick.y}
                            className={gcc.heroGridLine}
                          />
                          <text
                            x={CHART_PADDING.left - 12}
                            y={tick.y + 4}
                            textAnchor="end"
                            className={gcc.heroAxisLabel}
                            fontFamily={SVG_NUMBER_FONT}
                          >
                            {tick.value}
                          </text>
                        </g>
                      ))}

                      <defs>
                        <clipPath id="gcc-activity-plot-clip">
                          <rect
                            x={CHART_PADDING.left}
                            y={CHART_PADDING.top}
                            width={CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right}
                            height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
                          />
                        </clipPath>
                      </defs>

                      <g clipPath="url(#gcc-activity-plot-clip)">
                        <polyline className={gcc.heroSeriesLine} points={polyline} />
                        {chartPoints.map((point) => (
                          <circle
                            key={`dot-${point.label}-${point.value}`}
                            cx={point.x}
                            cy={point.y}
                            r={5}
                            className={gcc.heroSeriesPoint}
                          >
                            <title>{`${point.label}: ${point.value} movements`}</title>
                          </circle>
                        ))}
                      </g>

                      {chartPoints.map((point) => {
                        const labelY = point.y <= CHART_PADDING.top + 18 ? point.y + 20 : point.y - 12
                        return (
                          <g key={`point-${point.label}-${point.value}`}>
                            <text
                              x={point.x}
                              y={labelY}
                              textAnchor="middle"
                              className={gcc.heroPointLabel}
                              fontFamily={SVG_NUMBER_FONT}
                              fontWeight="700"
                            >
                              {point.value}
                            </text>
                            <text
                              x={point.x}
                              y={CHART_HEIGHT - CHART_PADDING.bottom + 26}
                              textAnchor="middle"
                              className={gcc.heroAxisLabel}
                            >
                              {point.label}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>
                )
              })()
            )}

            <Table dense grid className={gcc.heroTableSr}>
              <caption className={gcc.srOnly}>{title} data table fallback</caption>
              <TableHead>
                <TableRow>
                  <TableHeader>Day</TableHeader>
                  <TableHeader>Movements</TableHeader>
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
