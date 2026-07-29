import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { TrendPoint } from '@/lib/vaults/overview'
import { Absent, gcc, Panel } from './primitives'

/**
 * The hero panel — the reference's plot, driven by the real activity series.
 *
 * ── The honest part of a decorative chart ─────────────────────────────────
 * The reference plot is a composition: nine hand-drawn bezier paths, a white
 * glow, a mist wash, a neon green ribbon and a row of green tick blocks. Those
 * curves are ARTWORK — they encode no data, and there is no series in this
 * product that would reproduce them. Porting them as-is would put nine
 * invented series on screen, which is precisely what this console forbids.
 *
 * So the split is explicit:
 *   · the PLOT SURFACE is ported exactly — the three-stop background gradient,
 *     the 135×76 grid pattern, the five horizontal rules, the axis gutter, the
 *     glow filters, the green/white gradient definitions;
 *   · the CURVE is computed from the real movement series, in the reference's
 *     own visual language (a white glow pass, a white stroke, a green ribbon
 *     with its blurred halo, and the green tick row under the axis);
 *   · when there is no series, the surface renders and the curve does not,
 *     with the absence named in the panel — never a flat line at zero.
 *
 * Geometry is the reference's 1450×470 viewBox with `preserveAspectRatio:none`,
 * so the panel scales exactly as the prototype does.
 */

const VB_W = 1450
const VB_H = 470
/** Plot box, transcribed from the reference rects. */
const PLOT_X = 92
const PLOT_Y = 30
const PLOT_W = 1270
const PLOT_H = 392
const PLOT_BOTTOM = PLOT_Y + PLOT_H

/** A monotone-ish cubic through the points, in the reference's curve idiom. */
function curvePath(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return ''
  if (points.length === 1) {
    const only = points[0]!
    return `M${only.x} ${only.y}H${PLOT_X + PLOT_W}`
  }
  let path = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]!
    const current = points[i]!
    const midX = (previous.x + current.x) / 2
    path += `C${midX.toFixed(1)} ${previous.y.toFixed(1)},${midX.toFixed(1)} ${current.y.toFixed(1)},${current.x.toFixed(1)} ${current.y.toFixed(1)}`
  }
  return path
}

type Plotted = Readonly<{
  points: readonly { x: number; y: number; label: string; value: number }[]
  path: string
  area: string
}>

/**
 * Projects the series into the reference's plot box.
 *
 * ── Why the curve is confined to a band ───────────────────────────────────
 * The reference's neon ribbon does not sweep the full plot height: it lives in
 * the lower third (y≈340→425 in viewBox units), under a crowd of pale curves
 * that occupy the upper two thirds. A real two- or three-point series scaled to
 * the FULL box produces one enormous S that fills the panel and reads as a
 * different design. Scaling into the reference's own band keeps both the data
 * honest (min still sits at the band floor, max at its ceiling) and the visual
 * hierarchy intact.
 *
 * A single-valued series (every movement the same size) has no vertical range
 * to scale against; it is drawn on the band's mid-line rather than divided by
 * zero.
 */
const BAND_TOP = 268
const BAND_BOTTOM = 412

function plot(points: readonly TrendPoint[]): Plotted | null {
  if (points.length === 0) return null
  const values = points.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const step = points.length > 1 ? PLOT_W / (points.length - 1) : 0
  const projected = points.map((point, index) => ({
    x: PLOT_X + step * index,
    y:
      span === 0
        ? (BAND_TOP + BAND_BOTTOM) / 2
        : BAND_BOTTOM - ((point.value - min) / span) * (BAND_BOTTOM - BAND_TOP),
    label: point.label,
    value: point.value,
  }))
  const path = curvePath(projected)
  const last = projected.at(-1)!
  const first = projected[0]!
  return {
    points: projected,
    path,
    area: `${path}L${last.x.toFixed(1)} ${PLOT_BOTTOM}L${first.x.toFixed(1)} ${PLOT_BOTTOM}Z`,
  }
}

export function GreenHeroChartPanel({
  title,
  trend,
  axisLabel,
  countLabel,
}: Readonly<{
  title: string
  trend: Availability<readonly TrendPoint[]>
  /** What the vertical axis measures — money moved, or movements per day. */
  axisLabel: string
  countLabel: Availability<string>
}>) {
  const plotted = isAvailable(trend) ? plot(trend.value) : null

  return (
    <Panel className={gcc.heroChart} aria-labelledby="gcc-hero-title" data-gcc="hero-chart">
      <h2 id="gcc-hero-title" className={gcc.srOnly}>
        {title}
      </h2>
      <svg
        className={gcc.heroSvg}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        role="img"
        aria-labelledby="gcc-hero-svg-title gcc-hero-svg-desc"
        preserveAspectRatio="none"
      >
        <title id="gcc-hero-svg-title">{title}</title>
        <desc id="gcc-hero-svg-desc">
          {plotted === null
            ? `No curve is drawn: ${axisLabel} has no readable series.`
            : `${axisLabel}, ${plotted.points.length} points, plotted as a neon green curve over a dark grid.`}
        </desc>

        {/* ── Reference plot surface, transcribed ─────────────────────────── */}
        <defs>
          <linearGradient id="gccPlotBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f2026" />
            <stop offset="0.45" stopColor="#090a0d" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <linearGradient id="gccGreenFade" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#2d7f00" stopOpacity=".12" />
            <stop offset=".55" stopColor="#7cff00" />
            <stop offset="1" stopColor="#79ff00" stopOpacity=".12" />
          </linearGradient>
          <linearGradient id="gccMist" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#ffffff" stopOpacity=".55" />
            <stop offset=".58" stopColor="#bfc7dc" stopOpacity=".18" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id="gccGlowWhite">
            <feGaussianBlur stdDeviation="15" />
          </filter>
          <filter id="gccGlowGreen">
            <feGaussianBlur stdDeviation="11" />
          </filter>
          <pattern id="gccGrid" width="135" height="76" patternUnits="userSpaceOnUse">
            <path d="M135 0H0V76" fill="none" stroke="#4c4f58" strokeOpacity=".22" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={VB_W} height={VB_H} fill="url(#gccPlotBg)" />
        <rect x={PLOT_X} y={PLOT_Y} width={PLOT_W} height={PLOT_H} fill="url(#gccGrid)" />
        <g opacity=".55" stroke="#6f747f" strokeWidth="1">
          <path d="M92 104H1362" />
          <path d="M92 182H1362" />
          <path d="M92 260H1362" />
          <path d="M92 338H1362" />
          <path d="M92 416H1362" />
        </g>

        {/*
         * ── The atmospheric wash ────────────────────────────────────────────
         * The reference lifts the upper two thirds of its plot with broad pale
         * volumes. Those washes are LIGHT, not measurement: they carry no
         * value, no axis and no label, exactly like the vignette behind a
         * photograph. They are reproduced here because removing them changes
         * the material of the panel — the plot reads flat and empty without
         * them, which was the single largest visual gap in the first pass.
         *
         * What is NOT reproduced is the reference's nine pale CURVES. A curve
         * across a plot with an axis reads as a series, and this product has no
         * second series to put there. Drawing one would be an invented reading
         * dressed as decoration, so the wash is kept and the curves are not.
         */}
        <g aria-hidden="true">
          <path
            d="M92 75C203 93 319 130 438 176S710 259 891 283S1191 358 1362 415L1362 441C1180 402 1008 356 851 331S547 273 381 214S171 128 92 101Z"
            fill="url(#gccMist)"
            opacity=".2"
          />
          <path
            d="M95 78C228 8 389 96 511 159S758 252 907 252S1198 173 1362 82"
            fill="url(#gccMist)"
            fillOpacity=".1"
            stroke="none"
          />
        </g>

        {/*
         * The two structural rules of the reference plot. They are not data:
         * the green line is the console's own 200 bps rebalancing threshold
         * marker register, and the dashed line the reference's mid reference —
         * both are part of the plot furniture, drawn before any series.
         */}
        <path d="M93 229H1362" stroke="#7cff00" strokeWidth="1.3" strokeOpacity=".85" />
        <path d="M92 266H1362" stroke="#d9dce6" strokeOpacity=".58" strokeDasharray="5 4" />

        {/* ── The real series, in the reference's visual language ─────────── */}
        {plotted !== null ? (
          <>
            {/* The mist wash under the curve — the reference's pale volume. */}
            <path d={plotted.area} fill="url(#gccMist)" opacity=".16" />

            {/* The pale companion stroke the reference runs above its ribbon. */}
            <path
              d={plotted.path}
              fill="none"
              stroke="#fff"
              strokeOpacity=".2"
              strokeWidth="22"
              filter="url(#gccGlowWhite)"
            />
            <path d={plotted.path} fill="none" stroke="#d7dbea" strokeWidth="1.2" strokeOpacity=".55" />

            {/* The neon ribbon, at the reference's exact weights: an 18px halo
                at .34 under a 7px gradient stroke. */}
            <path
              d={plotted.path}
              fill="none"
              stroke="#7cff00"
              strokeWidth="18"
              strokeOpacity=".34"
              filter="url(#gccGlowGreen)"
            />
            <path d={plotted.path} fill="none" stroke="url(#gccGreenFade)" strokeWidth="7" />

            {/* The tick row under the plot. The reference's blocks vary in width;
                here each block's width is proportional to its own reading, so
                the row is a bar chart of the series rather than decoration. */}
            <g fill="#73ff00">
              {plotted.points.map((point, index) => {
                const slot = PLOT_W / plotted.points.length
                const max = Math.max(...plotted.points.map((p) => p.value))
                const share = max > 0 ? point.value / max : 0
                // The reference's blocks sit on an 80px pitch and rarely fill
                // their slot; capping the width at that pitch keeps the rhythm
                // when the series is short instead of producing wide slabs.
                const width = Math.max(3, Math.min(slot - 8, 76) * share)
                return (
                  <rect
                    key={`tick-${point.label}-${point.x.toFixed(0)}`}
                    x={PLOT_X + slot * index + 4}
                    y={PLOT_BOTTOM - 20}
                    width={width}
                    height={21}
                  />
                )
              })}
            </g>

            {/* Axis labels are the series' own dates — no invented time codes. */}
            <g fill="#d6dae4" fontSize="9" fontFamily="Arial, Helvetica, sans-serif">
              {plotted.points.map((point) => (
                <text
                  key={`label-${point.label}-${point.x.toFixed(0)}`}
                  x={Math.max(PLOT_X, Math.min(point.x - 14, PLOT_X + PLOT_W - 40))}
                  y={PLOT_BOTTOM + 22}
                >
                  {point.label}
                </text>
              ))}
            </g>
          </>
        ) : (
          /* No series: the surface stands, the curve does not. */
          <text x={PLOT_X + 8} y={PLOT_Y + PLOT_H / 2} fill="#9a9da5" fontSize="14" fontFamily="Arial, Helvetica, sans-serif">
            No readable activity series.
          </text>
        )}

        <g fill="#d8dce6" fontSize="10" fontFamily="Arial, Helvetica, sans-serif">
          <text x="5" y="66">
            {axisLabel}
          </text>
        </g>
      </svg>

      {/* The panel's own caption strip: what is plotted, and its count. */}
      <div className={gcc.panelCaption}>
        <span className={gcc.panelCaptionTitle}>{title}</span>
        <span className={gcc.panelCaptionNote}>
          {isAvailable(countLabel) ? (
            `${countLabel.value} movements · ${axisLabel}`
          ) : (
            <Absent availability={countLabel} showRoute={false} />
          )}
        </span>
      </div>
    </Panel>
  )
}
