import clsx from 'clsx'
import { HEARST_CONNECT_LOCKUP_LIGHT_SRC, HEARST_CONNECT_LOCKUP_SRC } from '@/lib/brand'

/** Hearst H glyph (official monogram) — inherits `currentColor`. */
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

/**
 * Themeable React lockup — mint H + "Hearst Connect" text.
 * On the dark admin background, prefer `HearstConnectLockupImage` (Illustrator asset).
 */
export function Logo({ className, ...props }: Readonly<React.ComponentPropsWithoutRef<'span'>>) {
  return (
    <span {...props} className={clsx(className, 'inline-flex items-center gap-2.5')}>
      <LogoMark className="size-8 text-[var(--accent-text)]" />
      <span className="text-base font-semibold tracking-tight whitespace-nowrap">Hearst Connect</span>
    </span>
  )
}

/** Official Illustrator lockup (Hearst-Defi) — dark background. */
export function HearstConnectLockupImage({
  className,
  alt = 'Hearst Connect',
}: Readonly<{ className?: string; alt?: string }>) {
  /* Deux versions : l'encre sombre pour le jour, le blanc pour la nuit — le
     thème choisit laquelle se voit (`.logo-day` / `.logo-night`). */
  return (
    <>
      <img src={HEARST_CONNECT_LOCKUP_LIGHT_SRC} alt={alt} className={clsx(className, 'logo-day shrink-0')} />
      <img src={HEARST_CONNECT_LOCKUP_SRC} alt={alt} className={clsx(className, 'logo-night shrink-0')} />
    </>
  )
}
