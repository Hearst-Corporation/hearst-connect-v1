'use client'

import { ScrambleText } from '@/components/ui/scramble-text'
import styles from '@/components/ui/scroll-velocity-planes.module.css'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
  type MotionValue,
} from 'motion/react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

const PLANE_WIDTH = 320
const PLANE_GAP = -80
const TOTAL_PLANES = 26

const PLANE_IMAGES = ['/brand/console-preview.png', '/brand/console-glow.png'] as const

const SCRAMBLE_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`░▒▓█▀▄■□▪▫●○◆◇◈◊※†‡'

export type ScrollVelocityPlanesProps = Readonly<{
  title: string
  titleLine2: string
  count: number
  hint: string
  labels: readonly string[]
}>

function Plane({
  index,
  scrollX,
  scrollVelocity,
  isHovered,
  label,
  imageSrc,
  onHoverStart,
  onHoverEnd,
}: Readonly<{
  index: number
  scrollX: MotionValue<number>
  scrollVelocity: MotionValue<number>
  isHovered: boolean
  label: string
  imageSrc: string
  onHoverStart: () => void
  onHoverEnd: () => void
}>) {
  const hoverOffset = useSpring(0, { stiffness: 400, damping: 25 })
  const waveOffset = useSpring(0, { stiffness: 300, damping: 20, mass: 0.3 })
  const planeWidth = PLANE_WIDTH + PLANE_GAP
  const totalWidth = planeWidth * TOTAL_PLANES
  const startPosition = index * planeWidth

  useMotionValueEvent(scrollVelocity, 'change', (velocity) => {
    const scroll = scrollX.get()
    const pos = startPosition + scroll
    const centered = wrap(-totalWidth / 2, totalWidth / 2, pos)
    const normalizedPos = centered / (totalWidth / 2)
    const wavePhase = Math.sin(normalizedPos * Math.PI * 2)
    const waveAmount = (velocity / 50) * wavePhase * 5
    waveOffset.set(waveAmount)
  })

  useEffect(() => {
    hoverOffset.set(isHovered ? -30 : 0)
  }, [hoverOffset, isHovered])

  const transform = useTransform(() => {
    const scroll = scrollX.get()
    const wave = waveOffset.get()
    const hover = hoverOffset.get()
    const pos = startPosition + scroll
    const centered = wrap(-totalWidth / 2, totalWidth / 2, pos)
    const yOffset = centered * -0.35 + wave + hover
    const zOffset = centered * -1.2
    return `translate3d(${centered}px, ${yOffset}px, ${zOffset}px) rotateY(-50deg)`
  })

  return (
    <motion.div
      className={styles.plane}
      style={{
        transform,
        zIndex: isHovered ? 100 : 1,
        filter: isHovered ? 'brightness(1.15)' : 'brightness(1)',
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    >
      <div className={styles.planeImageContainer}>
        <Image
          src={imageSrc}
          alt=""
          width={320}
          height={384}
          className={styles.planeImage}
          draggable={false}
        />
      </div>

      <div className={styles.planeIndex}>{String(index).padStart(2, '0')}</div>

      <AnimatePresence>
        {isHovered ? (
          <motion.div
            className={styles.labelContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className={styles.labelLine}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ scaleX: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <div className={styles.labelText}>
              <ScrambleText duration={0.45} chars={SCRAMBLE_CHARS}>
                {label}
              </ScrambleText>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

export function ScrollVelocityPlanes({ title, titleLine2, count, hint, labels }: ScrollVelocityPlanesProps) {
  const rawScrollX = useMotionValue(0)
  const scrollX = useSpring(rawScrollX, { stiffness: 100, damping: 30, mass: 0.5 })
  const scrollVelocity = useVelocity(scrollX)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY
      rawScrollX.set(rawScrollX.get() - delta)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [rawScrollX])

  return (
    <section className={styles.section} aria-label={title}>
      <motion.div
        ref={containerRef}
        className={styles.container}
        onPan={(_, info) => {
          rawScrollX.set(rawScrollX.get() + info.delta.x * 2.5)
        }}
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <div className={`${styles.title} ${styles.titleCollection}`}>
            {titleLine2}
            <sup className={styles.titleCount}>({count})</sup>
          </div>
        </div>

        <div className={styles.hint}>{hint}</div>

        <div className={styles.viewport}>
          <div className={styles.planesContainer}>
            {Array.from({ length: TOTAL_PLANES }, (_, i) => (
              <Plane
                key={i}
                index={i}
                scrollX={scrollX}
                scrollVelocity={scrollVelocity}
                isHovered={hoveredIndex === i}
                label={labels[i % labels.length] ?? '—'}
                imageSrc={PLANE_IMAGES[i % PLANE_IMAGES.length] ?? PLANE_IMAGES[0]}
                onHoverStart={() => setHoveredIndex(i)}
                onHoverEnd={() => setHoveredIndex(null)}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
