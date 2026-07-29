import { isAvailable, type Availability } from '@/lib/vaults/model'
import type { BarPoint } from '@/lib/vaults/overview'
import { gcc, Panel } from './primitives'

/**
 * The lower-left wave panel — movement types, in the reference's wave material.
 *
 * The reference draws one smooth white-and-green bell across the panel. It is a
 * shape, not a measurement. The material is ported exactly (the three-stop
 * background, the 28px white glow pass, the green fill at .24 under a
 * vertical green gradient) and applied to the ONLY series `/admin` has for
 * this slot: how many movements of each type the window holds.
 *
 * With no readable ledger the panel keeps its background and states the
 * absence — it does not draw a flat wave, which would read as "no activity"
 * rather than "no reading".
 */

const VB_W = 900
const VB_H = 220

/**
 * The reference wave rises from the baseline, peaks near the middle and returns
 * to it. Sorting the bars densest-first (as `movementTypeBars` does) and
 * plotting them left to right instead produces a descending ramp glued to the
 * left edge — the same data, a different shape, and not the reference's.
 *
 * So the series is re-ordered into a symmetric arrangement around the centre:
 * the largest type at the apex, the rest alternating outward. It is a
 * DISTRIBUTION, not a time series — nothing in it is ordered by time, so
 * arranging it for legibility invents nothing. The panel lists every type with
 * its real count beside the wave, which is what makes the reading exact.
 */
function centreWeighted(bars: readonly BarPoint[]): readonly BarPoint[] {
  const left: BarPoint[] = []
  const right: BarPoint[] = []
  bars.forEach((bar, index) => {
    if (index % 2 === 0) left.unshift(bar)
    else right.push(bar)
  })
  return [...left, ...right]
}

function wavePath(bars: readonly BarPoint[]): { line: string; fill: string } | null {
  if (bars.length === 0) return null
  const max = Math.max(...bars.map((bar) => bar.value))
  if (max <= 0) return null
  const ordered = centreWeighted(bars)
  const left = 25
  const right = 875
  // The wave leaves and rejoins the baseline, as the reference's does.
  const anchored = [{ label: '', value: 0 }, ...ordered, { label: '', value: 0 }]
  const step = anchored.length > 1 ? (right - left) / (anchored.length - 1) : 0
  const points = anchored.map((bar, index) => ({
    x: left + step * index,
    y: 183 - (bar.value / max) * 140,
  }))
  let line = `M${points[0]!.x.toFixed(1)} ${points[0]!.y.toFixed(1)}`
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1]!
    const current = points[i]!
    const midX = (previous.x + current.x) / 2
    line += `C${midX.toFixed(1)} ${previous.y.toFixed(1)},${midX.toFixed(1)} ${current.y.toFixed(1)},${current.x.toFixed(1)} ${current.y.toFixed(1)}`
  }
  return { line, fill: `${line}L${right} 183L${left} 183Z` }
}

export function GreenWavePanel({
  title,
  bars,
  availability,
}: Readonly<{ title: string; bars: readonly BarPoint[]; availability: Availability<unknown> }>) {
  const wave = isAvailable(availability) ? wavePath(bars) : null

  return (
    <Panel className={gcc.wavePanel} aria-label={title} data-gcc="wave-panel">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={
          wave === null
            ? `${title}: no readable series`
            : `${title}: ${bars.map((bar) => `${bar.label} ${bar.value}`).join(', ')}`
        }
      >
        <defs>
          <linearGradient id="gccLowerBg" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#25262d" />
            <stop offset=".4" stopColor="#07080b" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <linearGradient id="gccLowerGreen" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#8aff00" />
            <stop offset="1" stopColor="#43a900" stopOpacity=".15" />
          </linearGradient>
          <filter id="gccLowerGlow">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <rect width={VB_W} height={VB_H} fill="url(#gccLowerBg)" />
        {wave !== null && (
          <>
            <path
              d={wave.line}
              fill="none"
              stroke="#e8ecff"
              strokeOpacity=".18"
              strokeWidth="28"
              filter="url(#gccLowerGlow)"
            />
            <path d={wave.line} fill="none" stroke="#d7dbea" strokeWidth="1.5" />
            <path d={wave.fill} fill="#7cff00" opacity=".24" filter="url(#gccLowerGlow)" />
            <path d={wave.fill} fill="url(#gccLowerGreen)" />
          </>
        )}
      </svg>

      <div className={gcc.waveCaption}>
        <span className={gcc.waveCaptionTitle}>{title}</span>
        <div className={gcc.waveLegend}>
          {wave === null ? (
            <span className={gcc.waveLegendItem}>No readable movement series.</span>
          ) : (
            bars.map((bar) => (
              <span key={bar.label} className={gcc.waveLegendItem}>
                {bar.label} · <span className={gcc.waveLegendValue}>{bar.value}</span>
              </span>
            ))
          )}
        </div>
      </div>
    </Panel>
  )
}
