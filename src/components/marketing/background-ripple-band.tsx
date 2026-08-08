'use client'

import { BackgroundRippleEffect } from '@/components/ui/background-ripple-effect'

/**
 * Wave interlude — Aceternity grid that propagates ripples on hover or click.
 * Placed early (after the hero): atmospheric beat on the unified network, no CTA
 * (calls to action live in the hero and closing band) and no duplicate title.
 */
export function BackgroundRippleBand() {
  return (
    <section
      aria-labelledby="network-heading"
      className="relative flex min-h-112 w-full flex-col items-center justify-center overflow-hidden border-t border-console-line-soft py-24 md:min-h-128"
    >
      <BackgroundRippleEffect rows={8} cols={27} cellSize={56} />
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">One network</p>
        <h2
          id="network-heading"
          className="mt-4 text-3xl font-semibold tracking-tight text-balance text-white sm:text-4xl md:text-5xl"
        >
          All Hearst workspaces on a single surface
        </h2>
        <p className="mt-4 text-sm/6 text-white/50 md:text-base">
          Every vault, role, and journal — connected. Brush the grid: the wave follows.
        </p>
      </div>
    </section>
  )
}
