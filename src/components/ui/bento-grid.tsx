import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function BentoGrid({
  className,
  children,
}: Readonly<{
  className?: string
  children?: ReactNode
}>) {
  return (
    <div
      className={cn(
        'mx-auto grid max-w-7xl grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: Readonly<{
  className?: string
  title?: ReactNode
  description?: ReactNode
  header?: ReactNode
  icon?: ReactNode
}>) {
  return (
    <div
      className={cn(
        'group/bento row-span-1 flex flex-col justify-between space-y-4 rounded-xl bg-black/80 p-4 shadow-xs ring-1 ring-console-line-soft backdrop-blur-xl backdrop-saturate-150 transition duration-200 hover:ring-console-line',
        className,
      )}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="mt-2 mb-2 font-sans font-bold text-white">{title}</div>
        <div className="font-sans text-xs font-normal text-white/50">{description}</div>
      </div>
    </div>
  )
}
