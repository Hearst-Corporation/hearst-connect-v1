'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Tant qu'une transaction attend ses signataires ou sa diffusion, la page se relit toutes les 5 s. */
export function RefreshWhilePending() {
  const router = useRouter()
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), 5_000)
    return () => clearInterval(timer)
  }, [router])
  return null
}
