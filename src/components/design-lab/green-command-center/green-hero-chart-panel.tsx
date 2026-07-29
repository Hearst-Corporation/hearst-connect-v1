import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { TrendPoint } from '@/lib/vaults/overview'
import { Absent, gcc, Panel } from './primitives'
import { GreenPlotTexture } from './green-plot-texture'

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
  return { points: projected, path: curvePath(projected) }
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
        {/*
         * The description names ONLY the measurement. The decorative curve
         * texture under it is `aria-hidden` and is deliberately not described:
         * announcing pale lines that carry no value would invent a reading for
         * anyone who cannot see that they are ornament.
         */}
        <desc id="gcc-hero-svg-desc">
          {plotted === null
            ? `No curve is drawn: ${axisLabel} has no readable series.`
            : `${axisLabel}: ${plotted.points.length} measured points, drawn as the single neon green curve. ` +
              `${plotted.points.map((point) => `${point.label} ${point.value}`).join(', ')}.`}
        </desc>

        {/* ── Reference plot surface, transcribed ─────────────────────────── */}
        <defs>
          <linearGradient id="gccPlotBg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1f2026" />
            <stop offset="0.45" stopColor="#090a0d" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <linearGradient id="gccWhiteFade" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#f7f9ff" stopOpacity=".94" />
            <stop offset=".55" stopColor="#cbd0df" stopOpacity=".62" />
            <stop offset="1" stopColor="#f7f9ff" stopOpacity=".9" />
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
         * ── Decorative texture layer ────────────────────────────────────────
         * The reference's nine curves and two mist volumes, transcribed
         * verbatim and drawn UNDER the data layer. `GreenPlotTexture` takes no
         * props and is `aria-hidden`: it cannot read the registry, so it cannot
         * render a figure, and assistive technology is never told it exists.
         * It is the plot's material, in the same category as the shell's dust
         * texture. See that component's own header for the full argument.
         */}
        <GreenPlotTexture />

        {/*
         * The two structural rules of the reference plot. They are not data:
         * the green line is the console's own 200 bps rebalancing threshold
         * marker register, and the dashed line the reference's mid reference —
         * both are part of the plot furniture, drawn before any series.
         */}
        {/* Held back for the same reason as the texture's green lines: the full
            accent belongs to the measured series alone. */}
        <path d="M93 229H1362" stroke="#7cff00" strokeWidth="1.3" strokeOpacity=".4" />
        <path d="M92 266H1362" stroke="#d9dce6" strokeOpacity=".58" strokeDasharray="5 4" />

        {/*
         * ── The data layer ─────────────────────────────────────────────────
         * Painted AFTER the texture, so the measurement is always on top of the
         * material. It deliberately does NOT borrow the texture's pale palette:
         * with the reference's curve crowd restored beneath it, a pale stroke
         * would be indistinguishable from decoration. The reading is the accent
         * green ribbon — the one thing in this panel drawn in the accent, at the
         * reference's own ribbon weights (18px halo at .34 under a 7px gradient
         * stroke), plus a thin bright core so it survives against the texture.
         */}
        {plotted !== null ? (
          <g data-gcc="plot-series">
            {/* The neon ribbon, at the reference's exact weights: an 18px halo
                at .34 under a 7px gradient stroke, then a thin solid core that
                keeps the reading legible where the texture is brightest. */}
            <path
              d={plotted.path}
              fill="none"
              stroke="#7cff00"
              strokeWidth="18"
              strokeOpacity=".34"
              filter="url(#gccGlowGreen)"
            />
            <path d={plotted.path} fill="none" stroke="url(#gccGreenFade)" strokeWidth="7" />
            <path d={plotted.path} fill="none" stroke="#7cff00" strokeWidth="2" />

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
          </g>
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
