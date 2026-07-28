'use client'

import { chartHeight, chartTheme } from '@/lib/chart-theme'
import { formatCompactNumber, formatNumber, formatPercent } from '@/lib/format'
import type { Availability } from '@/lib/vaults/model'
import { SourceAvailabilityBadge } from '@/components/vaults/source-availability-badge'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type DashboardTrendPoint = Readonly<{
  label: string
  value: number
  detail: string
}>

export type DashboardBarPoint = Readonly<{
  label: string
  value: number
}>

function ChartUnavailable({
  availability,
  label,
}: Readonly<{
  availability: Availability<unknown>
  label: string
}>) {
  return (
    <div className="flex h-full min-h-36 flex-col justify-between rounded-xl bg-zinc-50/60 p-3 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
      <div className="space-y-2">
        <div className="h-12 rounded-xl bg-linear-to-b from-zinc-200/60 to-transparent dark:from-white/8 dark:to-transparent" />
        <div className="grid grid-cols-4 gap-2">
          <div className="h-8 rounded-lg bg-zinc-200/70 dark:bg-white/8" />
          <div className="h-5 self-end rounded-lg bg-zinc-200/45 dark:bg-white/6" />
          <div className="h-4 self-end rounded-lg bg-zinc-200/35 dark:bg-white/5" />
          <div className="h-6 self-end rounded-lg bg-zinc-200/50 dark:bg-white/7" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <SourceAvailabilityBadge availability={availability} compact />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      </div>
    </div>
  )
}

function TooltipFrame({
  title,
  lines,
}: Readonly<{
  title: string
  lines: readonly string[]
}>) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-800 dark:ring-console-line">
      <p className="font-medium text-zinc-950 dark:text-white">{title}</p>
      {lines.map((line) => (
        <p key={line} className="mt-0.5 text-zinc-500 dark:text-zinc-400">
          {line}
        </p>
      ))}
    </div>
  )
}

function TrendTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: DashboardTrendPoint }[] }>) {
  if (active !== true || payload?.length !== 1) return null
  const point = payload[0]?.payload
  if (point === undefined) return null
  return <TooltipFrame title={point.detail} lines={[formatCompactNumber(point.value)]} />
}

function DonutTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: { name: string; label: string; value: number } }[] }>) {
  if (active !== true || payload?.length !== 1) return null
  const slice = payload[0]?.payload
  if (slice === undefined) return null
  return <TooltipFrame title={slice.name} lines={[slice.label, formatPercent(slice.value, { fromBps: true })]} />
}

function BarTooltip({
  active,
  payload,
}: Readonly<{ active?: boolean; payload?: readonly { payload?: DashboardBarPoint }[] }>) {
  if (active !== true || payload?.length !== 1) return null
  const bar = payload[0]?.payload
  if (bar === undefined) return null
  return <TooltipFrame title={bar.label} lines={[formatNumber(bar.value)]} />
}

export function DashboardTrendChart({
  points,
  availability,
}: Readonly<{
  points: readonly DashboardTrendPoint[]
  availability: Availability<unknown>
}>) {
  if (points.length < 2) {
    return <ChartUnavailable availability={availability} label="Not enough ordered points." />
  }

  const height = Math.max(100, chartHeight('line', points.length) - 120)

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* The Y-axis is hidden; the negative left margin removes Recharts' reserved axis gutter so the plot fills the frame. */}
        <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="dashboard-trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartTheme.dataSeries.brandPrimary} stopOpacity={0.36} />
              <stop offset="100%" stopColor={chartTheme.dataSeries.brandPrimary} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
            tickLine={false}
            axisLine={false}
            minTickGap={20}
          />
          <YAxis hide />
          <Tooltip cursor={{ stroke: chartTheme.dataSeries.dataReference, strokeOpacity: 0.24 }} content={<TrendTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartTheme.dataSeries.brandPrimary}
            fill="url(#dashboard-trend-fill)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DashboardCapitalDonut({
  deployedBps,
  deployedLabel,
  idleLabel,
  availability,
}: Readonly<{
  deployedBps: number | null
  deployedLabel: string | null
  idleLabel: string | null
  availability: Availability<unknown>
}>) {
  if (deployedBps === null || deployedLabel === null || idleLabel === null) {
    return <ChartUnavailable availability={availability} label="Capital split unavailable." />
  }

  const idleBps = Math.max(0, 10000 - deployedBps)
  const data = [
    { name: 'Deployed', value: deployedBps, fill: chartTheme.dataSeries.brandPrimary, label: deployedLabel },
    { name: 'Idle', value: idleBps, fill: chartTheme.dataSeries.neutralRaised, label: idleLabel },
  ]

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-52" style={{ height: 128 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="88%"
              paddingAngle={2}
              isAnimationActive={false}
            />
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-2">
        {data.map((slice) => (
          <div key={slice.name} className="rounded-lg bg-zinc-50/70 px-2 py-1.5 ring-1 ring-zinc-950/5 dark:bg-white/3 dark:ring-white/5">
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="size-2 rounded-full" style={{ background: slice.fill }} />
              <span className="text-[0.6875rem]/4 uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                {slice.name}
              </span>
            </div>
            <p className="mt-1 text-[0.8125rem] font-semibold tabular-nums text-zinc-950 dark:text-white">{slice.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardProgressRadial({
  ratioBps,
  ratioLabel,
  availability,
}: Readonly<{
  ratioBps: number | null
  ratioLabel: string | null
  availability: Availability<unknown>
}>) {
  if (ratioBps === null || ratioLabel === null) {
    return <ChartUnavailable availability={availability} label="Ratio unavailable." />
  }

  const data = [{ value: ratioBps, fill: chartTheme.dataSeries.brandPrimary }]

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="relative w-full max-w-36" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 10000]} tick={false} />
            <RadialBar
              dataKey="value"
              background={{ fill: chartTheme.dataSeries.neutralSurface }}
              cornerRadius={999}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-xl font-semibold tracking-tight tabular-nums text-zinc-950 dark:text-white">{ratioLabel}</p>
          <p className="mt-0.5 text-[0.6875rem]/4 uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
            deployed
          </p>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Deployment ratio</p>
    </div>
  )
}

type DashboardBarPointWithFill = DashboardBarPoint & { readonly fill: string }

export function DashboardBarChart({
  bars,
  availability,
}: Readonly<{
  bars: readonly DashboardBarPoint[]
  availability: Availability<unknown>
}>) {
  if (bars.length === 0) {
    return <ChartUnavailable availability={availability} label="No categories to draw." />
  }

  const data: DashboardBarPointWithFill[] = bars.map((bar, index) => ({
    ...bar,
    fill: index === 0 ? chartTheme.dataSeries.brandPrimary : chartTheme.dataSeries.neutralRaised,
  }))
  const height = Math.max(100, chartHeight('columns', bars.length) - 96)

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* The Y-axis is hidden; the negative left margin removes Recharts' reserved axis gutter so the plot fills the frame. */}
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: chartTheme.tick, fontSize: chartTheme.axisFontSize }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={bars.length > 4 ? -18 : 0}
            textAnchor={bars.length > 4 ? 'end' : 'middle'}
            height={bars.length > 4 ? 46 : 28}
          />
          <YAxis hide />
          <Tooltip cursor={{ fill: chartTheme.cursor }} content={<BarTooltip />} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
