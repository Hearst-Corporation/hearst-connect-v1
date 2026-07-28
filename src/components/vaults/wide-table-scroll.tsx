import clsx from 'clsx'

/** Legacy wrapper kept for compatibility. */
export function WideTableScroll({
  children,
  className,
  hint,
}: Readonly<{
  children: React.ReactNode
  className?: string
  /** What the reader will find by scrolling — named, not implied. */
  hint?: string
}>) {
  return <div className={clsx(className, 'overflow-x-hidden')}>{children}</div>
}
