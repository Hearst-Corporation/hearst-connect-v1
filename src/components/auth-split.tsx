'use client'

import { HearstConnectLockupImage } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'

/** L'animation de marque, sur fond noir : le cube Hearst — la même que la landing. */
const ANIM = { src: '/brand/login/cube.mp4', poster: '/brand/login/cube-poster.jpg' } as const

/**
 * L'ENTRÉE DU PRODUIT — entre la landing et l'espace client / la console.
 *
 * À gauche, le panneau de marque, en NUIT dans les deux thèmes (comme la
 * colonne de menu du produit) : le cube en boucle, le logo — à la place et à
 * la taille exactes de la landing —, une phrase. À droite, le formulaire, qui
 * suit le thème jour / nuit. Sur mobile, le panneau passe en bandeau au-dessus
 * du formulaire.
 */
export function AuthSplit({ children }: Readonly<{ children: React.ReactNode }>) {
  const anim = ANIM
  return (
    <div className="auth-split">
      <aside className="auth-brand" data-theme="dark" aria-label="Hearst Connect">
        <video
          key={anim.src}
          className="auth-brand-video"
          src={anim.src}
          poster={anim.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="auth-brand-shade" aria-hidden="true" />
        <a href="/" className="auth-brand-logo">
          <HearstConnectLockupImage className="auth-logo-img" />
        </a>
        <div className="auth-brand-copy">
          <p className="auth-brand-eyebrow">Bitcoin Strategic Reserve</p>
          <p className="auth-brand-title">Mining power that builds your bitcoin reserve, month after month.</p>
        </div>
      </aside>
      <main className="auth-form">
        <div className="auth-form-top">
          <ThemeToggle />
        </div>
        <div className="auth-form-body">{children}</div>
      </main>
    </div>
  )
}
