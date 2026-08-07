import clsx from 'clsx'
import { HEARST_H_SRC } from '@/lib/brand'

/** Glyphe H Hearst (monogramme officiel) — hérite de `currentColor` via mask CSS, ou img. */
export function LogoMark({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'svg'>>) {
  return (
    <svg
      viewBox="0 0 155 170"
      aria-hidden="true"
      {...props}
      className={clsx(className, 'shrink-0 fill-current')}
    >
      <g transform="translate(-560 -455)">
        <polygon points="601.74 466.87 572.6 466.87 572.6 609.73 601.74 609.73 601.74 549.07 633.11 579.43 665.76 579.43 601.74 517.46 601.74 466.87" />
        <polygon points="672.72 466.87 672.72 528.12 644.63 500.93 611.98 500.93 672.72 559.72 672.72 609.73 701.86 609.73 701.86 466.87 672.72 466.87" />
      </g>
    </svg>
  )
}

/** Glyphe + wordmark. H en accent mint. */
export function Logo({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span {...props} className={clsx(className, 'inline-flex items-center gap-2.5')}>
      <LogoMark className="size-8 text-accent-300" />
      <span className="text-base font-semibold tracking-tight whitespace-nowrap">Hearst Connect</span>
    </span>
  )
}

/** Image publique du monogramme (asset `public/brand/hearst-h.svg`). */
export function HearstHImage({
  className,
  alt = '',
}: Readonly<{ className?: string; alt?: string }>) {
  return <img src={HEARST_H_SRC} alt={alt} className={clsx(className, 'shrink-0')} />
}
