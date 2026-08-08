import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/** Grille Aceternity — lignes via tokens console, fond noir. */
export function GridBackground({
  className,
  children,
}: Readonly<{
  className?: string
  children?: ReactNode
}>) {
  return (
    <div className={cn('relative flex w-full items-center justify-center bg-black', className)}>
      <div
        className={cn(
          'absolute inset-0',
          '[background-size:40px_40px]',
          '[background-image:linear-gradient(to_right,var(--color-console-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-console-line)_1px,transparent_1px)]',
        )}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      {children}
    </div>
  )
}
