import { GridBackground } from '@/components/ui/grid-background'

/** Démo Aceternity `grid-background-demo` — copy Hearst, noir + tokens console. */
export function GridBackgroundDemo() {
  return (
    <section className="w-full">
      <GridBackground className="h-[36rem] md:h-[50rem]">
        <p className="relative z-20 bg-linear-to-b from-white to-white/40 bg-clip-text py-8 text-center text-4xl font-bold text-transparent sm:text-7xl">
          Hearst Connect
        </p>
      </GridBackground>
    </section>
  )
}
