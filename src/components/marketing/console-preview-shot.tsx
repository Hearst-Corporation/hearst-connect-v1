import { cn } from '@/lib/utils'
import Image from 'next/image'

export const CONSOLE_PREVIEW_SRC = '/brand/console-preview.png' as const

export function ConsolePreviewShot({
  alt,
  className,
  priority = false,
}: Readonly<{
  alt: string
  className?: string
  priority?: boolean
}>) {
  return (
    <div className={cn('relative aspect-16/10 w-full overflow-hidden', className)}>
      <Image
        src={CONSOLE_PREVIEW_SRC}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 36rem"
        className="object-cover object-left-top"
        priority={priority}
        draggable={false}
      />
    </div>
  )
}
