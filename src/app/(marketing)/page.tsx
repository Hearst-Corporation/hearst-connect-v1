import { Cta } from '@/components/marketing/cta'
import { Faq } from '@/components/marketing/faq'
import { Features } from '@/components/marketing/features'
import { Hero } from '@/components/marketing/hero'
import { Pricing } from '@/components/marketing/pricing'
import { Security } from '@/components/marketing/security'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Security />
      <Pricing />
      <Faq />
      <Cta />
    </>
  )
}
