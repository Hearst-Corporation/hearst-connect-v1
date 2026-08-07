'use client'

import { motion, type MotionValue, useScroll, useTransform } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'

export function ContainerScroll({
  titleComponent,
  children,
}: Readonly<{
  titleComponent: React.ReactNode
  children: React.ReactNode
}>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1])

  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions())
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100])

  return (
    <div ref={containerRef} className="relative flex h-[60rem] items-center justify-center p-2 md:h-[80rem] md:p-20">
      <div className="relative w-full py-10 md:py-40" style={{ perspective: '1000px' }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  )
}

function Header({
  translate,
  titleComponent,
}: Readonly<{
  translate: MotionValue<number>
  titleComponent: React.ReactNode
}>) {
  return (
    <motion.div style={{ translateY: translate }} className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </motion.div>
  )
}

function Card({
  rotate,
  scale,
  children,
}: Readonly<{
  rotate: MotionValue<number>
  scale: MotionValue<number>
  children: React.ReactNode
}>) {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          '0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003',
      }}
      className="mx-auto -mt-12 h-[30rem] w-full max-w-5xl rounded-[30px] border-4 border-console-line-strong bg-console-shell p-2 shadow-2xl md:h-[40rem] md:p-6"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-console-app md:p-4">
        {children}
      </div>
    </motion.div>
  )
}
