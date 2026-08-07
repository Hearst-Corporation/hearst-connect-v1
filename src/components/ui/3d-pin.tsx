'use client'

import { cn } from '@/lib/utils'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'

export function PinContainer({
  children,
  title,
  href,
  className,
  containerClassName,
}: Readonly<{
  children: ReactNode
  title?: string
  href?: string
  className?: string
  containerClassName?: string
}>) {
  const [transform, setTransform] = useState('translate(-50%,-50%) rotateX(0deg)')
  const target = href ?? '/login'

  return (
    <Link
      href={target}
      className={cn('group/pin relative z-50 cursor-pointer', containerClassName)}
      onMouseEnter={() => setTransform('translate(-50%,-50%) rotateX(40deg) scale(0.8)')}
      onMouseLeave={() => setTransform('translate(-50%,-50%) rotateX(0deg) scale(1)')}
    >
      <div
        style={{ perspective: '1000px', transform: 'rotateX(70deg) translateZ(0deg)' }}
        className="absolute top-1/2 left-1/2 mt-4 ml-[0.09375rem] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          style={{ transform }}
          className="absolute top-1/2 left-1/2 flex items-start justify-start overflow-hidden rounded-2xl border border-console-line-soft bg-console-card p-4 shadow-xs ring-1 ring-console-line backdrop-blur-xl transition duration-700 group-hover/pin:border-console-line"
        >
          <div className={cn('relative z-50', className)}>{children}</div>
        </div>
      </div>
      <PinPerspective title={title} href={target} />
    </Link>
  )
}

function PinPulse({ delay }: Readonly<{ delay: number }>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: '-50%', y: '-50%' }}
      animate={{ opacity: [0, 1, 0.5, 0], scale: 1, z: 0 }}
      transition={{ duration: 6, repeat: Infinity, delay }}
      className="absolute top-1/2 left-1/2 h-[11.25rem] w-[11.25rem] rounded-full bg-accent-400/10 shadow-xs"
    />
  )
}

export function PinPerspective({ title }: Readonly<{ title?: string; href?: string }>) {
  return (
    <motion.div className="pointer-events-none z-60 flex h-80 w-96 items-center justify-center opacity-0 transition duration-500 group-hover/pin:opacity-100">
      <div className="inset-0 -mt-7 h-full w-full flex-none">
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <span className="relative z-10 flex items-center space-x-2 rounded-full bg-console-inset px-4 py-0.5 ring-1 ring-console-line">
            <span className="relative z-20 inline-block py-0.5 text-xs font-bold text-white">{title}</span>
            <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-linear-to-r from-accent-400/0 via-accent-400/90 to-accent-400/0 opacity-40 transition-opacity duration-500" />
          </span>
        </div>

        <div
          style={{ perspective: '1000px', transform: 'rotateX(70deg) translateZ(0)' }}
          className="absolute top-1/2 left-1/2 mt-4 ml-[0.09375rem] -translate-x-1/2 -translate-y-1/2"
        >
          <PinPulse delay={0} />
          <PinPulse delay={2} />
          <PinPulse delay={4} />
        </div>

        <motion.div className="absolute right-1/2 bottom-1/2 h-20 w-px translate-y-[14px] bg-linear-to-b from-transparent to-accent-400 blur-[2px] group-hover/pin:h-40" />
        <motion.div className="absolute right-1/2 bottom-1/2 h-20 w-px translate-y-[14px] bg-linear-to-b from-transparent to-accent-400 group-hover/pin:h-40" />
        <motion.div className="absolute right-1/2 bottom-1/2 z-40 size-1 translate-x-[1.5px] translate-y-[14px] rounded-full bg-accent-300 blur-[3px]" />
        <motion.div className="absolute right-1/2 bottom-1/2 z-40 size-0.5 translate-x-[0.5px] translate-y-[14px] rounded-full bg-accent-400" />
      </div>
    </motion.div>
  )
}
