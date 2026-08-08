'use client'

import { PinContainer } from '@/components/ui/3d-pin'
import Image from 'next/image'

/** Aceternity `3d-pin-demo` equivalent — console tokens + sign-in CTA. */
export function Pin3dDemo() {
  return (
    <section className="flex h-[40rem] w-full items-center justify-center bg-console-app" aria-label="3D preview">
      <PinContainer title="hearst-connect" href="/login">
        <div className="flex h-[20rem] w-[20rem] basis-full flex-col p-4 tracking-tight sm:basis-1/2">
          <h3 className="m-0 max-w-xs pb-2 text-base font-bold text-white">Hearst Connect</h3>
          <p className="m-0 p-0 text-base font-normal text-white/50">
            Unified access to Hearst workspaces — identities, permissions, and access logs.
          </p>
          <div className="relative mt-4 flex flex-1 w-full overflow-hidden rounded-lg ring-1 ring-console-line-soft">
            <Image
              src="/brand/console-preview.png"
              alt="Hearst Connect console preview"
              fill
              className="object-cover object-left-top"
              sizes="320px"
            />
          </div>
        </div>
      </PinContainer>
    </section>
  )
}
