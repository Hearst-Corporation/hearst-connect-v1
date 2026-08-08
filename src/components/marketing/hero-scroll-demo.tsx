'use client'

import { ContainerScroll } from '@/components/ui/container-scroll-animation'
import Image from 'next/image'
import Link from 'next/link'

/** Act 1 — Hero. Scroll reveals the product: the console capture straightens and scales. */
export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <div className="mx-auto max-w-3xl px-6">
            <p className="text-xs font-medium tracking-[0.2em] text-accent-300 uppercase">
              Hearst administration console
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl md:text-[5.5rem] md:leading-[1.02]">
              One sign-in <span className="text-accent-300">for all your Hearst workspaces</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm/6 text-white/50 md:text-base">
              Identities, permissions, and access logs in one console. In the product, every value comes from the
              Hearst backend — an absence stays an absence, never a filler number.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="rounded-md bg-accent-400 px-4 py-2.5 text-sm font-semibold text-accent-ink shadow-xs transition-colors hover:bg-accent-300"
              >
                Open the console
              </Link>
              <Link
                href="/register"
                className="text-sm/6 font-semibold text-white transition-colors hover:text-accent-300"
              >
                Request access <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/60">
              For Hearst workspace owners and administrators only.
            </p>
          </div>
        }
      >
        <Image
          src="/brand/console-preview.png"
          alt="Hearst Connect administration console preview"
          height={720}
          width={1400}
          className="mx-auto h-full rounded-2xl object-cover object-left-top"
          draggable={false}
          priority
        />
      </ContainerScroll>
    </div>
  )
}
