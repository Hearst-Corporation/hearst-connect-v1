import { AppStoreDemo } from '@/components/marketing/app-store-demo'
import { HeritageScrollDemo } from '@/components/marketing/heritage-scroll-demo'
import { BackgroundRippleBand } from '@/components/marketing/background-ripple-band'
import {
  BentoGridExampleThreeEnd,
  BentoGridExampleThreeStart,
} from '@/components/marketing/bento-grid-example-three'
import { GridBackgroundDemo } from '@/components/marketing/grid-background-demo'
import { HeroScrollDemo } from '@/components/marketing/hero-scroll-demo'

export default function HomePage() {
  return (
    <>
      <HeroScrollDemo />
      <HeritageScrollDemo />
      <GridBackgroundDemo />
      <AppStoreDemo />
      <BentoGridExampleThreeStart />
      <BackgroundRippleBand />
      <BentoGridExampleThreeEnd />
    </>
  )
}
