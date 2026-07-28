import clsx from 'clsx'

/**
 * Line-drawn isometric server racks — the console's visual signature.
 * Server Component, `currentColor`, zero dependencies.
 */

const COS30 = 0.8660254
const SIN30 = 0.5
const BAY_WIDTH = 1
const BAY_DEPTH = 1.15
const BAY_HEIGHT = 2.4
const BAY_GAP = 0.32
const UNIT_LINES = 6

type Point = { x: number; y: number }

function project(x: number, y: number, z: number): Point {
  return { x: (x - y) * COS30, y: (x + y) * SIN30 - z }
}

function polygon(points: Point[]): string {
  const commands = points.map((p, i) => {
    const prefix = i === 0 ? 'M' : 'L'
    return `${prefix}${p.x.toFixed(3)} ${p.y.toFixed(3)}`
  })
  return `${commands.join(' ')} Z`
}

function segment(a: Point, b: Point): string {
  const start = `${a.x.toFixed(3)} ${a.y.toFixed(3)}`
  const end = `${b.x.toFixed(3)} ${b.y.toFixed(3)}`
  return `M${start} L${end}`
}

function bayPaths(index: number): { frame: string[]; units: string[] } {
  const y0 = index * (BAY_DEPTH + BAY_GAP)
  const y1 = y0 + BAY_DEPTH
  const x0 = 0
  const x1 = BAY_WIDTH
  const z0 = 0
  const z1 = BAY_HEIGHT

  const top = polygon([project(x0, y0, z1), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z1)])
  const front = polygon([project(x1, y0, z0), project(x1, y1, z0), project(x1, y1, z1), project(x1, y0, z1)])
  const side = polygon([project(x0, y1, z0), project(x1, y1, z0), project(x1, y1, z1), project(x0, y1, z1)])

  const units: string[] = []
  for (let u = 1; u <= UNIT_LINES; u += 1) {
    const z = (BAY_HEIGHT / (UNIT_LINES + 1)) * u
    units.push(segment(project(x1, y0, z), project(x1, y1, z)))
  }

  return { frame: [top, front, side], units }
}

export function ComputeHallPoster({
  bays = 5,
  className,
  title = 'Isometric diagram of the vault server bays',
}: Readonly<{
  bays?: number
  className?: string
  title?: string
}>) {
  const geometry = Array.from({ length: bays }, (_, i) => bayPaths(i))
  const all = geometry.flatMap((_, i) => {
    const y0 = i * (BAY_DEPTH + BAY_GAP)
    const y1 = y0 + BAY_DEPTH
    return [
      project(0, y0, 0),
      project(BAY_WIDTH, y0, 0),
      project(0, y1, 0),
      project(BAY_WIDTH, y1, 0),
      project(0, y0, BAY_HEIGHT),
      project(BAY_WIDTH, y0, BAY_HEIGHT),
      project(0, y1, BAY_HEIGHT),
      project(BAY_WIDTH, y1, BAY_HEIGHT),
    ]
  })
  const pad = 0.4
  const minX = Math.min(...all.map((p) => p.x)) - pad
  const maxX = Math.max(...all.map((p) => p.x)) + pad
  const minY = Math.min(...all.map((p) => p.y)) - pad
  const maxY = Math.max(...all.map((p) => p.y)) + pad
  const viewBoxWidth = maxX - minX
  const viewBoxHeight = maxY - minY

  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`${minX.toFixed(3)} ${minY.toFixed(3)} ${viewBoxWidth.toFixed(3)} ${viewBoxHeight.toFixed(3)}`}
      className={clsx('dc-rack w-full', className)}
      fill="none"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
    >
      <title>{title}</title>
      {geometry.map((bay) => (
        <g key={bay.frame[0]} style={{ animationDelay: `${geometry.indexOf(bay) * 70}ms` }}>
          {bay.frame.map((d) => (
            <path key={`frame-${d}`} d={d} strokeWidth={0.022} />
          ))}
          {bay.units.map((d) => (
            <path key={`unit-${d}`} d={d} strokeWidth={0.012} strokeOpacity={0.45} />
          ))}
        </g>
      ))}
    </svg>
  )
}
