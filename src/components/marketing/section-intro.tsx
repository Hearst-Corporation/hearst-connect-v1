import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/**
 * Shared marketing section header — mint eyebrow + title + optional accent + subtitle.
 */
export function SectionIntro({
  id,
  eyebrow,
  title,
  titleAccent,
  sub,
  align = 'left',
  className,
}: Readonly<{
  id?: string
  eyebrow?: string
  title: ReactNode
  titleAccent?: string
  sub?: ReactNode
  align?: 'left' | 'center'
  className?: string
}>) {
  const isCenter = align === 'center'
  return (
    <div className={cn(isCenter ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow ? (
        <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">{eyebrow}</p>
      ) : null}
      <h2
        id={id}
        className={cn(
          'text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl',
          eyebrow && 'mt-4',
        )}
      >
        {title}
        {titleAccent ? <span className="text-accent-300"> {titleAccent}</span> : null}
      </h2>
      {sub ? <p className="mt-4 text-sm/6 text-white/50 md:text-base">{sub}</p> : null}
    </div>
  )
}
